import { bootstrapApplication } from '@angular/platform-browser';
import * as Sentry from '@sentry/angular';
import { App } from './app/app';
import { appConfig } from './app/app.config';
import { environment } from './environments/environment';

/** Error reporting starts before anything else, and only when a DSN is configured. */
export function startErrorReporting(dsn: string | null): void {
  if (dsn !== null) {
    Sentry.init({ dsn });
  }
}

startErrorReporting(environment.sentryDsn);

export const started = bootstrapApplication(App, appConfig).catch(
  (error: unknown): void => {
    Sentry.captureException(error);
    console.error(error);
  },
);
