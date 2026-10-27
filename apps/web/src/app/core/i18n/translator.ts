import { inject, Injectable, InjectionToken } from '@angular/core';
import type {
  Catalogue,
  Message,
  PluralMessage,
  TranslationParams,
} from './catalogue';
import type { TranslationKey } from './en';
import { EN } from './en';

/** Something to say, not yet in words: pure code returns these and templates translate them. */
export interface Translatable {
  readonly key: TranslationKey;
  readonly params?: TranslationParams;
}

export const CATALOGUE = new InjectionToken<Catalogue>('Catalogue', {
  factory: (): Catalogue => EN,
});

export const LOCALE = new InjectionToken<string>('Locale', {
  factory: (): string => 'en',
});

const PLACEHOLDER = /\{(\w+)\}/g;
const NO_PARAMS: TranslationParams = {};

/** Every word the app shows goes through here. A missing parameter stays visible as {name}, never blank. */
@Injectable({ providedIn: 'root' })
export class Translator {
  private readonly catalogue = inject(CATALOGUE);
  private readonly plurals = new Intl.PluralRules(inject(LOCALE));

  public translate(
    key: TranslationKey,
    params: TranslationParams = NO_PARAMS,
  ): string {
    return interpolate(this.formOf(this.messageOf(key), params), params);
  }

  public translateMessage(message: Translatable): string {
    return this.translate(message.key, message.params);
  }

  /** A key missing from a catalogue shows as itself: visible, never blank. */
  private messageOf(key: TranslationKey): Message {
    return this.catalogue[key] ?? key;
  }

  private formOf(message: Message, params: TranslationParams): string {
    return typeof message === 'string'
      ? message
      : this.pluralForm(message, params);
  }

  private pluralForm(
    message: PluralMessage,
    params: TranslationParams,
  ): string {
    return this.plurals.select(Number(params['count'])) === 'one'
      ? message.one
      : message.other;
  }
}

function interpolate(text: string, params: TranslationParams): string {
  return text.replace(PLACEHOLDER, (placeholder, name: string): string =>
    String(params[name] ?? placeholder),
  );
}
