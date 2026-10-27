import { inject, signal } from '@angular/core';
import type { Signal } from '@angular/core';
import type { Observable } from 'rxjs';
import { firstValueFrom } from 'rxjs';
import { ErrorReporter } from '../errors/error-reporter';

export type ActionStatus = 'idle' | 'pending' | 'succeeded' | 'failed';

/** A request the user triggers: its status as a signal, and its result once it succeeds. */
export interface Action<TInput, TResult> {
  readonly status: Signal<ActionStatus>;
  readonly result: Signal<TResult | null>;
  readonly run: (input: TInput) => Promise<TResult | null>;
}

/**
 * Wraps a request so components only read its status. A failure has already been shown and reported by
 * the HTTP interceptor; here it only becomes the "failed" status (reported once, thanks to the dedupe).
 * Create in an injection context.
 */
export function createAction<TInput, TResult>(
  request: (input: TInput) => Observable<TResult>,
): Action<TInput, TResult> {
  const reporter = inject(ErrorReporter);
  const status = signal<ActionStatus>('idle');
  const result = signal<TResult | null>(null);
  return {
    status: status.asReadonly(),
    result: result.asReadonly(),
    run: async (input): Promise<TResult | null> => {
      status.set('pending');
      try {
        const value = await firstValueFrom(request(input));
        result.set(value);
        status.set('succeeded');
        return value;
      } catch (error) {
        reporter.report(error, 'error');
        status.set('failed');
        return null;
      }
    },
  };
}
