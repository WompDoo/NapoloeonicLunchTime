import { requirePresent } from '@lunch-campaign/engine';
import { WEEK_ORDERS } from '@lunch-campaign/honours/testing';
import {
  MURAT_PLAYER,
  NAPOLEON_PLAYER,
  playSpiedWeek,
  spiedWeekView,
} from '@lunch-campaign/player-view/testing';
import { renderPlayerView } from '@lunch-campaign/render-ascii';
import type { MemoryIo } from '../testing/memory-io';
import {
  gm,
  ioWithOrderFiles,
  MATCH_PATH,
  ORDER_FILES,
  playScriptedWeekThroughCli,
} from '../testing/scripted-week-cli';
import { decodeMatchFile } from './match-file';
import { parseOrdersFile } from './order-notation';

function fileIn(io: MemoryIo, path: string): string {
  return requirePresent(io.files.get(path), path);
}

describe('the example playtest week', () => {
  const week = playSpiedWeek();
  const monday = requirePresent(week[0], 'Monday');
  const finished = requirePresent(week[5], 'the finished week');
  const io = playScriptedWeekThroughCli();
  io.takePrinted();

  it.each(ORDER_FILES.map((file, day) => ({ file, day })))(
    '$file holds the scripted orders',
    ({ file, day }) => {
      expect(
        parseOrdersFile(fileIn(ioWithOrderFiles(), file), file, monday.state),
      ).toEqual(WEEK_ORDERS[day]);
    },
  );

  it('ends exactly where the scripted week ends', () => {
    expect(decodeMatchFile(fileIn(io, MATCH_PATH), MATCH_PATH)).toEqual({
      version: 1,
      state: finished.state,
      replayLog: finished.logs.replayLog,
      spyLog: finished.logs.spyLog,
    });
  });

  it.each([NAPOLEON_PLAYER, MURAT_PLAYER])(
    'shows %s the same view as the libraries',
    (playerId) => {
      gm(io, ['view', MATCH_PATH, playerId]);
      expect(io.takePrinted()).toBe(
        renderPlayerView(spiedWeekView(5, playerId)),
      );
    },
  );

  it('scores the week', () => {
    gm(io, ['score', MATCH_PATH]);
    expect(io.takePrinted()).toMatchSnapshot();
  });
});
