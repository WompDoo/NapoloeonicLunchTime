import type { MatchupPreview } from '@lunch-campaign/contracts';
import { textOf } from '../../../testing/dom';
import { render } from '../../../testing/render';
import { MatchupPreviewCard } from './matchup-preview-card';

const STRENGTH = { contributions: [], baseStrength: 4, bonuses: [] };
const HINTS = [
  { unitType: 'line', beats: ['cavalry'], beatenBy: ['skirmishers'] },
  { unitType: 'artillery', beats: [], beatenBy: [] },
] as const;

describe('MatchupPreviewCard', () => {
  it.each([
    {
      preview: { kind: 'reinforcement' },
      says: ['A reinforcement: your own zone, no battle.'],
    },
    { preview: { kind: 'unopposed' }, says: ['No army there now.'] },
    {
      preview: { kind: 'countHidden', hints: HINTS },
      says: ['Fog hides how many', 'Line infantry beat Cavalry'],
    },
    {
      preview: { kind: 'countOnly', defenderCount: 1, hints: HINTS },
      says: [
        '1 unit defends. Spy on it for an estimate.',
        'Line infantry fear Skirmishers',
      ],
    },
    {
      preview: {
        kind: 'estimate',
        estimate: {
          attacker: { ...STRENGTH, totalStrength: 4.25 },
          defender: { ...STRENGTH, totalStrength: 3 },
          likelyWinner: 'you',
        },
        unidentified: 2,
        hints: [],
      },
      says: [
        'Your strength 4.3',
        'Defender’s strength 3',
        'You would likely win',
        '2 unidentified units are left out.',
      ],
    },
    {
      preview: {
        kind: 'estimate',
        estimate: {
          attacker: { ...STRENGTH, totalStrength: 2 },
          defender: { ...STRENGTH, totalStrength: 5 },
          likelyWinner: 'defender',
        },
        unidentified: 0,
        hints: [],
      },
      says: ['The defender would likely hold'],
    },
  ] satisfies readonly { preview: MatchupPreview; says: readonly string[] }[])(
    'tells what is known of a $preview.kind fight',
    async ({ preview, says }) => {
      const fixture = await render(MatchupPreviewCard, { preview });
      says.forEach((text) => {
        expect(textOf(fixture)).toContain(text);
      });
      expect(textOf(fixture)).toContain('Not a promise');
    },
  );

  it('says nothing about units it left out when the spy saw everything', async () => {
    const fixture = await render(MatchupPreviewCard, {
      preview: {
        kind: 'estimate',
        estimate: {
          attacker: { ...STRENGTH, totalStrength: 2 },
          defender: { ...STRENGTH, totalStrength: 1 },
          likelyWinner: 'you',
        },
        unidentified: 0,
        hints: [],
      } satisfies MatchupPreview,
    });
    expect(textOf(fixture)).not.toContain('unidentified');
  });
});
