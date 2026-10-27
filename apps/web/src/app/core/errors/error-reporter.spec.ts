import { TestBed } from '@angular/core/testing';
import { captureException } from '@sentry/angular';
import { RecordingSink } from '../../../testing/recording-sink';
import { ERROR_SINK, ErrorReporter } from './error-reporter';

jest.mock('@sentry/angular', () => ({ captureException: jest.fn() }));

describe('ErrorReporter', () => {
  function reporterWith(sink: RecordingSink): ErrorReporter {
    TestBed.configureTestingModule({
      providers: [{ provide: ERROR_SINK, useValue: sink }],
    });
    return TestBed.inject(ErrorReporter);
  }

  it('reports an error once, however many places catch it', () => {
    const sink = new RecordingSink();
    const reporter = reporterWith(sink);
    const error = new Error('boom');
    reporter.report(error, 'error');
    reporter.report(error, 'warning');
    expect(sink.reports).toEqual([{ error, severity: 'error' }]);
  });

  it('reports values that are not objects every time', () => {
    const sink = new RecordingSink();
    const reporter = reporterWith(sink);
    reporter.report('text', 'warning');
    reporter.report('text', 'warning');
    expect(sink.reports).toHaveLength(2);
  });

  it('sends reports to Sentry by default', () => {
    const error = new Error('to sentry');
    TestBed.inject(ErrorReporter).report(error, 'warning');
    expect(captureException).toHaveBeenCalledWith(error, { level: 'warning' });
  });
});
