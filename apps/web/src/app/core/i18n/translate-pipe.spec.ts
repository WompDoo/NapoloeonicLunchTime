import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TranslateMessagePipe, TranslatePipe } from './translate-pipe';

@Component({
  selector: 'lc-pipes-host',
  imports: [TranslatePipe, TranslateMessagePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<p>{{ 'common.units' | t: { count: 3 } }}</p>
    <p>{{ { key: 'app.name' } | tm }}</p>`,
})
class PipesHost {}

describe('translation pipes', () => {
  it('translate keys and messages in templates', async () => {
    const fixture = TestBed.createComponent(PipesHost);
    await fixture.whenStable();
    const paragraphs = [
      ...(fixture.nativeElement as HTMLElement).querySelectorAll('p'),
    ].map((p) => p.textContent);
    expect(paragraphs).toEqual(['3 units', 'Lunch Campaign']);
  });
});
