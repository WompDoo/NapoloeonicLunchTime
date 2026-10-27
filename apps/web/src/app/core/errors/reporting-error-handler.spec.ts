import { TestBed } from '@angular/core/testing';
import { RecordingSink } from '../../../testing/recording-sink';
import { ERROR_SINK } from './error-reporter';
import { ReportingErrorHandler } from './reporting-error-handler';

describe('ReportingErrorHandler', () => {
  it('reports an uncaught error and still logs it', () => {
    const sink = new RecordingSink();
    TestBed.configureTestingModule({
      providers: [
        ReportingErrorHandler,
        { provide: ERROR_SINK, useValue: sink },
      ],
    });
    const log = jest
      .spyOn(console, 'error')
      .mockImplementation((): void => undefined);
    const error = new Error('uncaught');
    TestBed.inject(ReportingErrorHandler).handleError(error);
    expect(sink.reports).toEqual([{ error, severity: 'error' }]);
    expect(log).toHaveBeenCalledWith(error);
  });
});
