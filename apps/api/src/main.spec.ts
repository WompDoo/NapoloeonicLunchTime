import { Logger } from '@nestjs/common';

describe('main', () => {
  const environment = process.env;

  afterEach(() => {
    process.env = environment;
    jest.restoreAllMocks();
  });

  it('starts the API from environment variables and stops cleanly', async () => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    process.env = { ...environment, PORT: '0', DATABASE_PATH: ':memory:' };
    const { runningApi } = await import('./main');
    const app = await runningApi;
    const response = await fetch(`${await app.getUrl()}/health`);
    expect(await response.json()).toEqual({ status: 'ok' });
    await app.close();
  });
});
