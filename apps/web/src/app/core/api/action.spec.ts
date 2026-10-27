import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { RecordingSink } from '../../../testing/recording-sink';
import { ERROR_SINK } from '../errors/error-reporter';
import { createAction } from './action';

describe('createAction', () => {
  it('runs a request and keeps its result', async () => {
    const action = TestBed.runInInjectionContext(() =>
      createAction((name: string) => of(`hello ${name}`)),
    );
    expect(action.status()).toBe('idle');
    const running = action.run('Ana');
    expect(action.status()).toBe('pending');
    expect(await running).toBe('hello Ana');
    expect(action.status()).toBe('succeeded');
    expect(action.result()).toBe('hello Ana');
  });

  it('turns a failure into the failed status, reported', async () => {
    const sink = new RecordingSink();
    TestBed.configureTestingModule({
      providers: [{ provide: ERROR_SINK, useValue: sink }],
    });
    const error = new Error('refused');
    const action = TestBed.runInInjectionContext(() =>
      createAction(() => throwError(() => error)),
    );
    expect(await action.run(undefined)).toBeNull();
    expect(action.status()).toBe('failed');
    expect(sink.reports).toEqual([{ error, severity: 'error' }]);
  });
});
