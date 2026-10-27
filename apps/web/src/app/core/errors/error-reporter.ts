import { Injectable, InjectionToken, inject } from '@angular/core';
import * as Sentry from '@sentry/angular';

export type ErrorSeverity = 'warning' | 'error';

/** The parts of Sentry the app uses, so tests can see what was reported. */
export interface ErrorSink {
  readonly capture: (error: unknown, severity: ErrorSeverity) => void;
}

export const ERROR_SINK = new InjectionToken<ErrorSink>('ErrorSink', {
  factory: (): ErrorSink => ({
    capture: (error, severity): void => {
      Sentry.captureException(error, { level: severity });
    },
  }),
});

/**
 * Every caught error is reported here, once: an error caught by the HTTP interceptor and again by the
 * code that made the request is still one report. Sentry is a no-op until a DSN is configured.
 */
@Injectable({ providedIn: 'root' })
export class ErrorReporter {
  private readonly sink = inject(ERROR_SINK);
  private readonly reported = new WeakSet<object>();

  public report(error: unknown, severity: ErrorSeverity): void {
    if (this.wasReported(error)) {
      return;
    }
    this.remember(error);
    this.sink.capture(error, severity);
  }

  private wasReported(error: unknown): boolean {
    return error instanceof Object && this.reported.has(error);
  }

  private remember(error: unknown): void {
    if (error instanceof Object) {
      this.reported.add(error);
    }
  }
}
