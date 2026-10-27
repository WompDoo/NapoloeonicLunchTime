import { inject, Injectable, InjectionToken } from '@angular/core';
import { ErrorReporter } from '../errors/error-reporter';
import { Translator } from '../i18n/translator';
import { Snackbar } from '../notifications/snackbar';

/** The part of the Clipboard API the app uses. */
export interface TextClipboard {
  readonly writeText: (text: string) => Promise<void>;
}

export const TEXT_CLIPBOARD = new InjectionToken<TextClipboard>(
  'TextClipboard',
  {
    factory: (): TextClipboard => navigator.clipboard,
  },
);

/** Copies text. A refusal (no permission, an insecure page, no clipboard) is reported and explained. */
@Injectable({ providedIn: 'root' })
export class ClipboardWriter {
  private readonly clipboard = inject(TEXT_CLIPBOARD);
  private readonly reporter = inject(ErrorReporter);
  private readonly snackbar = inject(Snackbar);
  private readonly translator = inject(Translator);

  /** True once the text is on the clipboard. */
  public async copy(text: string): Promise<boolean> {
    try {
      await this.clipboard.writeText(text);
      return true;
    } catch (error) {
      this.reporter.report(error, 'warning');
      this.snackbar.show(this.translator.translate('common.copyFailed'));
      return false;
    }
  }
}
