import { InjectionToken } from '@angular/core';
import { environment } from '../../../environments/environment';

export const API_BASE_URL = new InjectionToken<string>('ApiBaseUrl', {
  factory: (): string => environment.apiBaseUrl,
});

const MATCH_PATH = /\/matches\/([^/]+)/;

/** The match a request is about, from its URL: the one whose player token it needs. */
export function matchIdInUrl(url: string): string | null {
  const match = MATCH_PATH.exec(url);
  return match === null ? null : match.slice(1).join('');
}
