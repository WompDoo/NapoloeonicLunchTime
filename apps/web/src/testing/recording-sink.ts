import type {
  ErrorSeverity,
  ErrorSink,
} from '../app/core/errors/error-reporter';

export interface Report {
  readonly error: unknown;
  readonly severity: ErrorSeverity;
}

/** Stands in for Sentry: remembers what was reported. */
export class RecordingSink implements ErrorSink {
  public readonly reports: Report[] = [];

  public readonly capture = (error: unknown, severity: ErrorSeverity): void => {
    this.reports.push({ error, severity });
  };
}
