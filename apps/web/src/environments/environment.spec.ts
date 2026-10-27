import { environment } from './environment';
import { environment as production } from './environment.prod';

describe('environments', () => {
  it('reach the API under /api, with Sentry off until a DSN is set', () => {
    expect(environment).toEqual({ apiBaseUrl: '/api', sentryDsn: null });
    expect(production.apiBaseUrl).toBe('/api');
  });
});
