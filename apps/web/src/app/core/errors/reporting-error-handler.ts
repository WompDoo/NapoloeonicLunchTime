import { Injectable, inject } from '@angular/core';
import type { ErrorHandler } from '@angular/core';
import { ErrorReporter } from './error-reporter';

/** Errors nothing else caught: reported, and still logged for whoever has the console open. */
@Injectable()
export class ReportingErrorHandler implements ErrorHandler {
  private readonly reporter = inject(ErrorReporter);

  public handleError(error: unknown): void {
    this.reporter.report(error, 'error');
    console.error(error);
  }
}
