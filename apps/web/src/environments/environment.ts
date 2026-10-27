/** Development: the API runs beside the dev server, behind its proxy; no error reporting. */
export const environment = {
  apiBaseUrl: '/api',
  sentryDsn: null as string | null,
};
