import type { ApiError } from '@lunch-campaign/contracts';
import type { TranslationKey } from '../core/i18n/en';

/** The message for a refusal shown inline in a form. */
export function errorKeyOf(error: ApiError): TranslationKey {
  return `errors.${error.code}`;
}
