import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import type { EnvironmentProviders, Provider } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { apiErrorInterceptor } from '../app/core/api/api-error-interceptor';
import { playerTokenInterceptor } from '../app/core/api/player-token-interceptor';
import { TEXT_CLIPBOARD } from '../app/core/clipboard/clipboard-writer';
import { ERROR_SINK } from '../app/core/errors/error-reporter';
import { SESSION_STORAGE } from '../app/core/sessions/player-sessions';
import { FakeClipboard } from './fake-clipboard';
import { MemoryStorage } from './memory-storage';
import { RecordingSink } from './recording-sink';

/** The fakes behind a test app, to arrange and inspect. */
export interface TestDoubles {
  readonly sink: RecordingSink;
  readonly storage: MemoryStorage;
  readonly clipboard: FakeClipboard;
}

/** The app's real HTTP stack and interceptors over a testing backend, with every browser service faked. */
export function provideWebTesting(
  doubles: TestDoubles = createDoubles(),
): (Provider | EnvironmentProviders)[] {
  return [
    provideHttpClient(
      withInterceptors([playerTokenInterceptor, apiErrorInterceptor]),
    ),
    provideHttpClientTesting(),
    provideRouter([]),
    { provide: ERROR_SINK, useValue: doubles.sink },
    { provide: SESSION_STORAGE, useValue: doubles.storage },
    { provide: TEXT_CLIPBOARD, useValue: doubles.clipboard },
  ];
}

export function createDoubles(): TestDoubles {
  return {
    sink: new RecordingSink(),
    storage: new MemoryStorage(),
    clipboard: new FakeClipboard(),
  };
}

/** Configures TestBed with the testing providers and hands back the fakes. */
export function setUpWebTest(
  extraProviders: (Provider | EnvironmentProviders)[] = [],
): TestDoubles {
  const doubles = createDoubles();
  TestBed.configureTestingModule({
    providers: [...provideWebTesting(doubles), ...extraProviders],
  });
  return doubles;
}

export function httpTesting(): HttpTestingController {
  return TestBed.inject(HttpTestingController);
}
