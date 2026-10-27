import type * as SentryApi from '@sentry/angular';
import type * as Main from './main';

jest.mock('@sentry/angular', () => ({
  init: jest.fn(),
  captureException: jest.fn(),
}));
jest.mock('@angular/platform-browser', () => ({
  ...jest.requireActual<object>('@angular/platform-browser'),
  bootstrapApplication: jest.fn(),
}));

interface LoadedMain {
  readonly main: typeof Main;
  readonly sentry: typeof SentryApi;
  readonly bootstrap: jest.Mock;
}

/** A fresh copy of main.ts, which starts the app as it is imported, with bootstrapping faked. */
async function loadMain(bootstrapped: Promise<unknown>): Promise<LoadedMain> {
  jest.resetModules();
  const platform = await import('@angular/platform-browser');
  const bootstrap = jest.mocked(
    platform.bootstrapApplication,
  ) as unknown as jest.Mock;
  bootstrap.mockReturnValue(bootstrapped);
  const sentry = await import('@sentry/angular');
  const main = await import('./main');
  return { main, sentry, bootstrap };
}

describe('main', () => {
  it('starts the app, with no error reporting until a DSN is configured', async () => {
    const { main, sentry, bootstrap } = await loadMain(Promise.resolve({}));
    await main.started;
    expect(bootstrap).toHaveBeenCalled();
    expect(sentry.init).not.toHaveBeenCalled();
    main.startErrorReporting('https://key@sentry.example/1');
    expect(sentry.init).toHaveBeenCalledWith({
      dsn: 'https://key@sentry.example/1',
    });
  });

  it('reports a failed start', async () => {
    const failure = new Error('no root element');
    const log = jest
      .spyOn(console, 'error')
      .mockImplementation((): void => undefined);
    const { main, sentry } = await loadMain(Promise.reject(failure));
    await main.started;
    expect(sentry.captureException).toHaveBeenCalledWith(failure);
    expect(log).toHaveBeenCalledWith(failure);
  });
});
