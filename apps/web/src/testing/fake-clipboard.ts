import type { TextClipboard } from '../app/core/clipboard/clipboard-writer';

/** A clipboard that records what was copied, or refuses like a browser without permission. */
export class FakeClipboard implements TextClipboard {
  public copied: string | null = null;
  public refusing = false;

  public readonly writeText = async (text: string): Promise<void> => {
    if (this.refusing) {
      throw new DOMException('Clipboard access denied', 'NotAllowedError');
    }
    this.copied = text;
  };
}
