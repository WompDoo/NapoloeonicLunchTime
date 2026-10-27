import { HttpContextToken } from '@angular/common/http';
import { computed, Injectable, signal } from '@angular/core';
import type { Signal } from '@angular/core';
import type { ApiError } from '@lunch-campaign/contracts';

/** Forms that show their 4xx errors inline. A request names its form with the ERROR_SCOPE context. */
export type ErrorScope =
  | 'createMatch'
  | 'join'
  | 'lobby'
  | 'orders'
  | 'spy'
  | 'preview';

type ScopedErrors = Readonly<Partial<Record<ErrorScope, ApiError>>>;

export const ERROR_SCOPE = new HttpContextToken<ErrorScope | null>(
  (): null => null,
);

/** The latest refused request per form, set by the HTTP interceptor and read by the form. */
@Injectable({ providedIn: 'root' })
export class InlineErrors {
  private readonly errors = signal<ScopedErrors>({});

  public for(scope: ErrorScope): Signal<ApiError | null> {
    return computed((): ApiError | null => this.errors()[scope] ?? null);
  }

  public set(scope: ErrorScope, error: ApiError): void {
    this.errors.update(
      (errors): ScopedErrors => ({ ...errors, [scope]: error }),
    );
  }

  public clear(scope: ErrorScope): void {
    this.errors.update(
      (errors): ScopedErrors => ({ ...errors, [scope]: undefined }),
    );
  }
}
