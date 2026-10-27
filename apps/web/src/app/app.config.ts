import { provideHttpClient, withInterceptors } from '@angular/common/http';
import type { ApplicationConfig } from '@angular/core';
import {
  ErrorHandler,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { appRoutes } from './app.routes';
import { apiErrorInterceptor } from './core/api/api-error-interceptor';
import { playerTokenInterceptor } from './core/api/player-token-interceptor';
import { ReportingErrorHandler } from './core/errors/reporting-error-handler';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(appRoutes, withComponentInputBinding()),
    provideHttpClient(
      withInterceptors([playerTokenInterceptor, apiErrorInterceptor]),
    ),
    { provide: ErrorHandler, useClass: ReportingErrorHandler },
  ],
};
