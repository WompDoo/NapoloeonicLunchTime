import { apiEnvironmentOf } from './api-environment';

describe('apiEnvironmentOf', () => {
  it('has a default for everything', () => {
    expect(apiEnvironmentOf({})).toEqual({
      port: 3000,
      databasePath: 'lunch-campaign.sqlite',
      webOrigin: null,
      logLevels: ['log', 'warn', 'error'],
    });
  });

  it('reads PORT, DATABASE_PATH and WEB_ORIGIN', () => {
    expect(
      apiEnvironmentOf({
        PORT: '8080',
        DATABASE_PATH: '/data/lunch.sqlite',
        WEB_ORIGIN: 'https://lunch.example',
      }),
    ).toMatchObject({
      port: 8080,
      databasePath: '/data/lunch.sqlite',
      webOrigin: 'https://lunch.example',
    });
  });

  it('refuses a port that is not a whole number', () => {
    expect(() => apiEnvironmentOf({ PORT: 'eighty' })).toThrow(
      'PORT must be a whole number, got "eighty"',
    );
  });
});
