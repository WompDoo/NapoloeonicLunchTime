import { DEFAULT_MATCH_CONFIG } from '@lunch-campaign/content';
import { createInitialMatchState } from '@lunch-campaign/engine';
import { WEEK_SEATING } from '@lunch-campaign/honours/testing';
import type { MatchFile } from './match-file';
import { decodeMatchFile, encodeMatchFile, logsOf } from './match-file';

const MATCH: MatchFile = {
  version: 1,
  state: createInitialMatchState(DEFAULT_MATCH_CONFIG, WEEK_SEATING, 'file'),
  replayLog: [],
  spyLog: [],
};

describe('match file', () => {
  it('round-trips through text', () => {
    const text = encodeMatchFile(MATCH);
    expect(text.endsWith('}\n')).toBe(true);
    expect(decodeMatchFile(text, 'week.json')).toEqual(MATCH);
  });

  it('hands the logs to views', () => {
    expect(logsOf(MATCH)).toEqual({ replayLog: [], spyLog: [] });
  });

  it.each([
    {
      name: 'invalid JSON',
      text: 'nope',
      message: 'week.json is not valid JSON',
    },
    {
      name: 'another version',
      text: JSON.stringify({ ...MATCH, version: 2 }),
      message: 'week.json is match file version 2; this CLI reads version 1',
    },
    {
      name: 'a missing state',
      text: JSON.stringify({ ...MATCH, state: null }),
      message: 'week.json.state must be an object',
    },
    {
      name: 'a replay log that is not a list',
      text: JSON.stringify({ ...MATCH, replayLog: {} }),
      message: 'week.json.replayLog must be an array',
    },
  ])('refuses $name', ({ text, message }) => {
    expect(() => decodeMatchFile(text, 'week.json')).toThrow(message);
  });
});
