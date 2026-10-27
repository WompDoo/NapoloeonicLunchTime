import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common';
import { Catch, HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { ApiError, ApiErrorCode } from '@lunch-campaign/contracts';
import { InvalidRequestError } from '@lunch-campaign/contracts';
import type { Response } from 'express';
import { DomainError } from '../errors/domain-error';

/** 4xx codes are the player's to fix and shown inline; 5xx are ours. */
export const STATUS_BY_CODE: Readonly<Record<ApiErrorCode, HttpStatus>> = {
  'request.invalid': HttpStatus.BAD_REQUEST,
  'route.notFound': HttpStatus.NOT_FOUND,
  'auth.missingToken': HttpStatus.UNAUTHORIZED,
  'auth.unknownToken': HttpStatus.UNAUTHORIZED,
  'auth.wrongMatch': HttpStatus.FORBIDDEN,
  'match.notFound': HttpStatus.NOT_FOUND,
  'match.notStarted': HttpStatus.CONFLICT,
  'match.finished': HttpStatus.CONFLICT,
  'match.conflict': HttpStatus.CONFLICT,
  'lobby.unknownTimeZone': HttpStatus.UNPROCESSABLE_ENTITY,
  'lobby.unknownInvite': HttpStatus.NOT_FOUND,
  'lobby.full': HttpStatus.CONFLICT,
  'lobby.started': HttpStatus.CONFLICT,
  'lobby.unknownCommander': HttpStatus.UNPROCESSABLE_ENTITY,
  'lobby.noCommander': HttpStatus.CONFLICT,
  'day.closed': HttpStatus.CONFLICT,
  'orders.invalid': HttpStatus.UNPROCESSABLE_ENTITY,
  'spy.matchFinished': HttpStatus.CONFLICT,
  'spy.playerEliminated': HttpStatus.CONFLICT,
  'spy.unknownZone': HttpStatus.UNPROCESSABLE_ENTITY,
  'spy.ownZone': HttpStatus.UNPROCESSABLE_ENTITY,
  'spy.spiesUnavailable': HttpStatus.CONFLICT,
  'spy.insufficientSupply': HttpStatus.UNPROCESSABLE_ENTITY,
  internal: HttpStatus.INTERNAL_SERVER_ERROR,
};

interface ErrorTranslation {
  readonly matches: (exception: unknown) => boolean;
  readonly toApiError: (exception: never) => ApiError;
}

const TRANSLATIONS: readonly ErrorTranslation[] = [
  {
    matches: (exception): boolean => exception instanceof DomainError,
    toApiError: (exception: DomainError): ApiError => ({
      statusCode: STATUS_BY_CODE[exception.code],
      code: exception.code,
      message: exception.message,
      problems: exception.problems,
    }),
  },
  {
    matches: (exception): boolean => exception instanceof InvalidRequestError,
    toApiError: (exception: InvalidRequestError): ApiError =>
      apiError('request.invalid', exception.message),
  },
  {
    matches: (exception): boolean => exception instanceof HttpException,
    toApiError: (exception: HttpException): ApiError => ({
      statusCode: exception.getStatus(),
      code: httpExceptionCode(exception.getStatus()),
      message: exception.message,
      problems: [],
    }),
  },
];

/** Every error leaves the API in one shape, with a stable code. Unexpected errors are logged and hidden. */
@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  public catch(exception: unknown, host: ArgumentsHost): void {
    const error = this.toApiError(exception);
    host
      .switchToHttp()
      .getResponse<Response>()
      .status(error.statusCode)
      .json(error);
  }

  private toApiError(exception: unknown): ApiError {
    const translation = TRANSLATIONS.find((candidate): boolean =>
      candidate.matches(exception),
    );
    return translation === undefined
      ? this.internalError(exception)
      : translation.toApiError(exception as never);
  }

  private internalError(exception: unknown): ApiError {
    this.logger.error('Unexpected error', exception);
    return apiError('internal', 'Something went wrong on our side');
  }
}

function apiError(code: ApiErrorCode, message: string): ApiError {
  return { statusCode: STATUS_BY_CODE[code], code, message, problems: [] };
}

/** Errors Nest or Express raise themselves: unknown routes, malformed JSON, oversized bodies. */
function httpExceptionCode(status: number): ApiErrorCode {
  return status === HttpStatus.NOT_FOUND ? 'route.notFound' : 'request.invalid';
}
