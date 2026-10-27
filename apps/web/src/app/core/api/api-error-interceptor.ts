import { HttpErrorResponse } from '@angular/common/http';
import type { HttpEvent, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import type { ApiError } from '@lunch-campaign/contracts';
import type { Observable } from 'rxjs';
import { catchError, throwError } from 'rxjs';
import { ErrorReporter } from '../errors/error-reporter';
import type { TranslationKey } from '../i18n/en';
import { Translator } from '../i18n/translator';
import { Snackbar } from '../notifications/snackbar';
import type { ErrorScope } from './inline-errors';
import { ERROR_SCOPE, InlineErrors } from './inline-errors';

const CLIENT_ERROR_MIN = 400;
const SERVER_ERROR_MIN = 500;

interface Failure {
  readonly error: unknown;
  readonly apiError: ApiError | null;
  readonly scope: ErrorScope | null;
}

/**
 * The one place API errors are handled. A 4xx refusal for a form goes inline to that form; everything
 * else, including network failures and 5xx, becomes a translated snackbar. Every error is reported, then
 * passed on so the resource or action that made the request knows it failed.
 */
export const apiErrorInterceptor: HttpInterceptorFn = (
  request,
  next,
): Observable<HttpEvent<unknown>> => {
  const inlineErrors = inject(InlineErrors);
  const snackbar = inject(Snackbar);
  const translator = inject(Translator);
  const reporter = inject(ErrorReporter);
  const scope = request.context.get(ERROR_SCOPE);
  clearScope(inlineErrors, scope);
  return next(request).pipe(
    catchError((error: unknown): Observable<never> => {
      const failure: Failure = { error, apiError: apiErrorOf(error), scope };
      reporter.report(error, severityOf(failure));
      showFailure(
        failure,
        inlineErrors,
        (text): void => snackbar.show(text),
        translator,
      );
      return throwError((): unknown => error);
    }),
  );
};

function clearScope(
  inlineErrors: InlineErrors,
  scope: ErrorScope | null,
): void {
  if (scope !== null) {
    inlineErrors.clear(scope);
  }
}

function showFailure(
  failure: Failure,
  inlineErrors: InlineErrors,
  showSnackbar: (text: string) => void,
  translator: Translator,
): void {
  const inline = inlineTarget(failure);
  if (inline === null) {
    showSnackbar(translator.translate(snackbarKey(failure.apiError)));
    return;
  }
  inlineErrors.set(inline.scope, inline.apiError);
}

/** A 4xx refusal with a form to show it in, or null when it belongs in a snackbar. */
function inlineTarget(failure: Failure): InlineTarget | null {
  return failure.scope === null
    ? null
    : clientErrorIn(failure.scope, failure.apiError);
}

interface InlineTarget {
  readonly scope: ErrorScope;
  readonly apiError: ApiError;
}

function clientErrorIn(
  scope: ErrorScope,
  apiError: ApiError | null,
): InlineTarget | null {
  return isClientError(apiError) ? { scope, apiError } : null;
}

function isClientError(apiError: ApiError | null): apiError is ApiError {
  return apiError !== null && apiError.statusCode < SERVER_ERROR_MIN;
}

function severityOf(failure: Failure): 'warning' | 'error' {
  return isClientError(failure.apiError) ? 'warning' : 'error';
}

function snackbarKey(apiError: ApiError | null): TranslationKey {
  return apiError === null ? 'errors.network' : `errors.${apiError.code}`;
}

/** The API's error body, when the server sent one; null for network failures and foreign errors. */
export function apiErrorOf(error: unknown): ApiError | null {
  return error instanceof HttpErrorResponse ? apiErrorIn(error.error) : null;
}

function apiErrorIn(body: unknown): ApiError | null {
  return isApiError(body) ? body : null;
}

function isApiError(body: unknown): body is ApiError {
  return body instanceof Object && hasCodeAndStatus(body);
}

function hasCodeAndStatus(body: object): boolean {
  return 'code' in body && hasStatus(body);
}

function hasStatus(body: object): boolean {
  return 'statusCode' in body && Number(body.statusCode) >= CLIENT_ERROR_MIN;
}
