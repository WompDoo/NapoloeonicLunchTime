import { ErrorHandler } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { appConfig } from './app.config';
import { ReportingErrorHandler } from './core/errors/reporting-error-handler';

describe('appConfig', () => {
  it('reports every uncaught error', () => {
    TestBed.configureTestingModule({ providers: appConfig.providers });
    expect(TestBed.inject(ErrorHandler)).toBeInstanceOf(ReportingErrorHandler);
  });
});
