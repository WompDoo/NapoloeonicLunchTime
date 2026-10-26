import { requirePresent } from '@lunch-campaign/engine';
import type { CliIo } from './cli-io';
import { createMemoryIo } from '../testing/memory-io';
import type { MemoryIo } from '../testing/memory-io';
import {
  ioWithOrderFiles,
  MATCH_PATH,
  playScriptedWeekThroughCli,
  startScriptedWeek,
} from '../testing/scripted-week-cli';
import { decodeMatchFile } from './match-file';
import { EXIT_FAILURE, EXIT_SUCCESS, runCli } from './run-cli';

const SEATS = ['napoleon-player:napoleon', 'murat-player:murat'];

function startedMatch(): MemoryIo {
  const io = ioWithOrderFiles();
  startScriptedWeek(io);
  io.takePrinted();
  return io;
}

function failure(io: MemoryIo, args: readonly string[]): string {
  expect(runCli(args, io)).toBe(EXIT_FAILURE);
  return io.printedErrors();
}

function success(io: MemoryIo, args: readonly string[]): string {
  expect(runCli(args, io)).toBe(EXIT_SUCCESS);
  return io.takePrinted();
}

function matchIn(io: MemoryIo): ReturnType<typeof decodeMatchFile> {
  return decodeMatchFile(
    requirePresent(io.files.get(MATCH_PATH), MATCH_PATH),
    MATCH_PATH,
  );
}

describe('runCli', () => {
  describe('help', () => {
    it.each([[[]], [['help']]])('prints help for %j', (args) => {
      const printed = success(createMemoryIo(), args);
      expect(printed).toContain('gm resolve <match.json> <orders.json>');
      expect(printed).toContain('ability A2 -> B2 2L');
    });

    it('refuses an unknown command, with help', () => {
      const errors = failure(createMemoryIo(), ['fly']);
      expect(errors).toContain('Unknown command "fly".');
      expect(errors).toContain('gm score <match.json>');
    });

    it.each([
      {
        args: ['spy', MATCH_PATH, 'napoleon-player'],
        usage: 'spy <match.json> <player> <zone>',
      },
      { args: ['score', MATCH_PATH, 'extra'], usage: 'score <match.json>' },
      {
        args: ['new', MATCH_PATH, 'seed'],
        usage: 'new <match.json> <seed> <player>:<commander>...',
      },
    ])('shows the usage for $args', ({ args, usage }) => {
      expect(failure(createMemoryIo(), args)).toBe(`Usage: gm ${usage}\n`);
    });
  });

  describe('new', () => {
    it('starts a match with seats in the order given', () => {
      const io = createMemoryIo();
      const printed = success(io, ['new', MATCH_PATH, 'seed-1', ...SEATS]);
      expect(printed).toContain(`Started ${MATCH_PATH} with 2 players.`);
      expect(printed).toContain('It is Monday');
      const players = matchIn(io).state.players;
      expect(
        players.map((player) => [
          player.playerId,
          player.seat,
          player.commanderId,
        ]),
      ).toEqual([
        ['napoleon-player', 1, 'napoleon'],
        ['murat-player', 2, 'murat'],
      ]);
    });

    it.each([
      {
        name: 'a seat without a commander',
        seat: 'ney',
        message: '"ney" is not <player>:<commander>',
      },
      {
        name: 'an unknown commander',
        seat: 'ney:ney',
        message:
          'the commander of ney must be one of: napoleon, wellington, murat, blucher, kutuzov, moore',
      },
    ])('refuses $name', ({ seat, message }) => {
      expect(
        failure(createMemoryIo(), ['new', MATCH_PATH, 'seed', seat]),
      ).toContain(message);
    });

    it('never replaces an existing match', () => {
      const io = startedMatch();
      const before = io.files.get(MATCH_PATH);
      expect(failure(io, ['new', MATCH_PATH, 'seed', ...SEATS])).toContain(
        `${MATCH_PATH} already exists; delete it first to start over`,
      );
      expect(io.files.get(MATCH_PATH)).toBe(before);
    });
  });

  describe('spy', () => {
    it('charges the spy, logs the report and prints it', () => {
      const io = startedMatch();
      expect(success(io, ['spy', MATCH_PATH, 'kutuzov-player', 'A1'])).toBe(
        'Spy report on A1, held by napoleon-player: 3L 2C 2S 1A\n',
      );
      const match = matchIn(io);
      expect(match.spyLog).toHaveLength(1);
      const kutuzov = requirePresent(
        match.state.players.find(
          (player) => player.playerId === 'kutuzov-player',
        ),
        'kutuzov-player',
      );
      expect(kutuzov.supply).toBe(4);
    });

    it('explains a refused spy and changes nothing', () => {
      const io = startedMatch();
      const before = io.files.get(MATCH_PATH);
      expect(failure(io, ['spy', MATCH_PATH, 'napoleon-player', 'A1'])).toBe(
        'No spy sent: players cannot spy on their own zones\n',
      );
      expect(io.files.get(MATCH_PATH)).toBe(before);
    });
  });

  describe('resolve', () => {
    it('lists the orders the engine rejected', () => {
      const io = startedMatch();
      io.files.set(
        'bad.json',
        JSON.stringify({ 'napoleon-player': ['move B2 -> B3 1L'] }),
      );
      expect(success(io, ['resolve', MATCH_PATH, 'bad.json'])).toBe(
        [
          'Resolved Monday night. Orders rejected: 1.',
          "  napoleon-player's order 1 (move) was rejected: insufficient units",
          `It is Tuesday: send each player "gm view ${MATCH_PATH} <player>".`,
          '',
        ].join('\n'),
      );
    });

    it.each([
      {
        name: 'a missing orders file',
        args: ['resolve', MATCH_PATH, 'none.json'],
        message: 'none.json does not exist',
      },
      {
        name: 'a missing match file',
        args: ['resolve', 'nowhere.json', '1-monday.json'],
        message: 'nowhere.json does not exist',
      },
    ])('refuses $name', ({ args, message }) => {
      expect(failure(startedMatch(), args)).toBe(`${message}\n`);
    });

    it('refuses a night after Friday', () => {
      const io = playScriptedWeekThroughCli();
      expect(failure(io, ['resolve', MATCH_PATH, '5-friday.json'])).toBe(
        `The match is over: gm score ${MATCH_PATH}\n`,
      );
    });
  });

  describe('view and score', () => {
    it('prints one player’s view', () => {
      expect(
        success(startedMatch(), ['view', MATCH_PATH, 'murat-player']),
      ).toContain('LUNCH CAMPAIGN - Monday (turn 1), as seen by murat-player');
    });

    it('scores only a finished match', () => {
      expect(failure(startedMatch(), ['score', MATCH_PATH])).toBe(
        'The match is not over: it is Monday\n',
      );
    });
  });

  it('reports failures that are not errors too', () => {
    const io = createMemoryIo();
    const throwing: CliIo = {
      ...io,
      exists: () => true,
      readText: () => {
        throw 'disk on fire';
      },
    };
    expect(runCli(['view', MATCH_PATH, 'p1'], throwing)).toBe(EXIT_FAILURE);
    expect(io.printedErrors()).toBe('disk on fire\n');
  });
});
