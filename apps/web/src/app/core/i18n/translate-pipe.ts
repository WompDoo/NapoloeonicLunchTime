import { inject, Pipe } from '@angular/core';
import type { PipeTransform } from '@angular/core';
import type { TranslationParams } from './catalogue';
import type { TranslationKey } from './en';
import type { Translatable } from './translator';
import { Translator } from './translator';

/** `{{ 'home.title' | t }}` or `{{ 'units.count' | t: { count } }}`. */
@Pipe({ name: 't' })
export class TranslatePipe implements PipeTransform {
  private readonly translator = inject(Translator);

  public transform(key: TranslationKey, params?: TranslationParams): string {
    return this.translator.translate(key, params);
  }
}

/** `{{ message | tm }}` for a Translatable built in code. */
@Pipe({ name: 'tm' })
export class TranslateMessagePipe implements PipeTransform {
  private readonly translator = inject(Translator);

  public transform(message: Translatable): string {
    return this.translator.translateMessage(message);
  }
}
