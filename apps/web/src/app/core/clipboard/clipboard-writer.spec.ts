import { TestBed } from '@angular/core/testing';
import { setUpWebTest } from '../../../testing/test-providers';
import { Snackbar } from '../notifications/snackbar';
import { ClipboardWriter, TEXT_CLIPBOARD } from './clipboard-writer';

describe('ClipboardWriter', () => {
  it('copies text', async () => {
    const { clipboard } = setUpWebTest();
    expect(
      await TestBed.inject(ClipboardWriter).copy('https://example.test/join/x'),
    ).toBe(true);
    expect(clipboard.copied).toBe('https://example.test/join/x');
  });

  it('explains and reports a refusal', async () => {
    const { clipboard, sink } = setUpWebTest();
    clipboard.refusing = true;
    expect(await TestBed.inject(ClipboardWriter).copy('text')).toBe(false);
    expect(TestBed.inject(Snackbar).message()).toMatchObject({
      text: 'Could not copy. Select the link and copy it yourself.',
    });
    expect(sink.reports).toEqual([
      { error: expect.any(DOMException), severity: 'warning' },
    ]);
  });

  it('uses the browser clipboard by default', () => {
    const clipboard = { writeText: jest.fn() };
    Object.defineProperty(navigator, 'clipboard', {
      value: clipboard,
      configurable: true,
    });
    expect(TestBed.inject(TEXT_CLIPBOARD)).toBe(clipboard);
  });
});
