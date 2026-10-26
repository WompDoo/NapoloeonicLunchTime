import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { WEEK_SEATING } from '@lunch-campaign/honours/testing';
import { WEEK_SEED, WEEK_SPIES } from '@lunch-campaign/player-view/testing';
import { EXIT_SUCCESS, runCli } from '../app/run-cli';
import type { MemoryIo } from './memory-io';
import { createMemoryIo } from './memory-io';

export const MATCH_PATH = 'week.json';

/** The example playtest week shipped with the CLI, one orders file per day. */
export const ORDER_FILES = [
  '1-monday.json',
  '2-tuesday.json',
  '3-wednesday.json',
  '4-thursday.json',
  '5-friday.json',
];

const PLAYTEST_DIRECTORY = join(__dirname, '../../playtest/scripted-week');

/** Runs one CLI command, failing loudly with the CLI's own error output. */
export function gm(io: MemoryIo, args: readonly string[]): void {
  if (runCli(args, io) !== EXIT_SUCCESS) {
    throw new Error(`gm ${args.join(' ')} failed: ${io.printedErrors()}`);
  }
}

export function ioWithOrderFiles(): MemoryIo {
  return createMemoryIo(
    Object.fromEntries(
      ORDER_FILES.map((file) => [
        file,
        readFileSync(join(PLAYTEST_DIRECTORY, file), 'utf8'),
      ]),
    ),
  );
}

export function startScriptedWeek(io: MemoryIo): void {
  gm(io, [
    'new',
    MATCH_PATH,
    WEEK_SEED,
    ...WEEK_SEATING.map((seat) => `${seat.playerId}:${seat.commanderId}`),
  ]);
}

/** A GM's week: each day, the spies players asked for, then the night with that day's orders file. */
export function playScriptedWeekThroughCli(): MemoryIo {
  const io = ioWithOrderFiles();
  startScriptedWeek(io);
  ORDER_FILES.forEach((file, day) => {
    (WEEK_SPIES[day] ?? []).forEach((spy) => {
      gm(io, ['spy', MATCH_PATH, spy.playerId, spy.zoneId]);
    });
    gm(io, ['resolve', MATCH_PATH, file]);
  });
  return io;
}
