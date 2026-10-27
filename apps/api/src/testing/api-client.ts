/** One HTTP exchange, kept so tests can check everything the API ever sent. */
export interface Exchange {
  readonly token: string | undefined;
  readonly status: number;
  readonly text: string;
}

export interface ApiResponse {
  readonly status: number;
  readonly body: unknown;
}

export interface ApiRequest {
  readonly token?: string;
  readonly body?: unknown;
  readonly rawBody?: string;
}

/** A tiny fetch client for the API under test. */
export class ApiClient {
  public readonly exchanges: Exchange[] = [];

  public constructor(private readonly baseUrl: string) {}

  public async send(
    method: string,
    path: string,
    request: ApiRequest = {},
  ): Promise<ApiResponse> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        'content-type': 'application/json',
        ...authorization(request.token),
      },
      body: bodyFor(request),
    });
    const text = await response.text();
    this.exchanges.push({
      token: request.token,
      status: response.status,
      text,
    });
    return { status: response.status, body: parsed(text) };
  }
}

function authorization(token: string | undefined): Record<string, string> {
  return token === undefined ? {} : { authorization: `Bearer ${token}` };
}

function bodyFor(request: ApiRequest): string | undefined {
  return request.rawBody ?? jsonOf(request.body);
}

function jsonOf(body: unknown): string | undefined {
  return body === undefined ? undefined : JSON.stringify(body);
}

function parsed(text: string): unknown {
  return text === '' ? null : JSON.parse(text);
}

/** Runs async steps one after another, in order. */
export async function inSequence<T>(
  items: readonly T[],
  step: (item: T, index: number) => Promise<void>,
): Promise<void> {
  await items.reduce(
    (previous, item, index) => previous.then(() => step(item, index)),
    Promise.resolve(),
  );
}
