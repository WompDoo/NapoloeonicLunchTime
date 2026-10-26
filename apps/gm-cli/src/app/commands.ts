import { DEFAULT_MATCH_CONFIG } from '@lunch-campaign/content';
import type {
  MatchState,
  PlayerSeating,
  ReplayEvent,
  TurnResult,
} from '@lunch-campaign/engine';
import {
  createInitialMatchState,
  decodeOneOf,
  isMatchFinished,
  requirePresent,
  resolveTurn,
  toPlayerId,
  toZoneId,
} from '@lunch-campaign/engine';
import { scoreMatch } from '@lunch-campaign/honours';
import type { SpyRejectionReason } from '@lunch-campaign/player-view';
import { filterForPlayer, spyOnZone } from '@lunch-campaign/player-view';
import {
  narrateVisibleEvent,
  renderFinalScore,
  renderPlayerView,
  renderSpyReport,
} from '@lunch-campaign/render-ascii';
import type { CliIo } from './cli-io';
import { CliError } from './cli-error';
import type { Command } from './command';
import { defineCommand } from './command';
import type { MatchFile } from './match-file';
import { logsOf, MATCH_FILE_VERSION } from './match-file';
import {
  loadMatch,
  readExistingFile,
  refuseToOverwrite,
  saveMatch,
} from './match-store';
import { group, ORDER_EXAMPLES, parseOrdersFile } from './order-notation';

/** v0 plays every match with the default rules and map. */
const CONFIG = DEFAULT_MATCH_CONFIG;
const SEAT = /^(?<playerId>[^:\s]+):(?<commanderId>[^:\s]+)$/;
const FIRST_SEAT = 1;

const SPY_REJECTIONS: Readonly<Record<SpyRejectionReason, string>> = {
  matchFinished: 'the match is over',
  playerEliminated: 'that player is out of the match',
  unknownZone: 'there is no such zone on the map',
  ownZone: 'players cannot spy on their own zones',
  spiesUnavailable: 'spies are unavailable today',
  insufficientSupply: 'not enough supply',
};

export const COMMANDS: Readonly<Record<string, Command>> = {
  new: defineCommand({
    usage: 'new <match.json> <seed> <player>:<commander>...',
    summary: 'Start a match. Seats follow the order the players are given in.',
    parameters: ['match', 'seed', 'seat'],
    takesList: true,
    run: ({ args, rest, io }): void => {
      startMatch(io, args.match, args.seed, [args.seat, ...rest]);
    },
  }),
  spy: defineCommand({
    usage: 'spy <match.json> <player> <zone>',
    summary: "Send a player's spy, charge them and print the report for them.",
    parameters: ['match', 'player', 'zone'],
    takesList: false,
    run: ({ args, io }): void => {
      sendSpy(io, args.match, args.player, args.zone);
    },
  }),
  resolve: defineCommand({
    usage: 'resolve <match.json> <orders.json>',
    summary: "Resolve tonight with everyone's orders.",
    parameters: ['match', 'orders'],
    takesList: false,
    run: ({ args, io }): void => {
      resolveNight(io, args.match, args.orders);
    },
  }),
  view: defineCommand({
    usage: 'view <match.json> <player>',
    summary: 'Print what one player may see today: send it to them.',
    parameters: ['match', 'player'],
    takesList: false,
    run: ({ args, io }): void => {
      const match = loadMatch(io, args.match);
      io.print(
        renderPlayerView(
          filterForPlayer(
            match.state,
            logsOf(match),
            toPlayerId(args.player),
            CONFIG,
          ),
        ),
      );
    },
  }),
  score: defineCommand({
    usage: 'score <match.json>',
    summary: 'Print the final score once Friday is resolved.',
    parameters: ['match'],
    takesList: false,
    run: ({ args, io }): void => {
      printFinalScore(io, loadMatch(io, args.match));
    },
  }),
  help: defineCommand({
    usage: 'help',
    summary: 'Show this help.',
    parameters: [],
    takesList: false,
    run: ({ io }): void => {
      io.print(helpText());
    },
  }),
};

export function helpText(): string {
  return [
    'Lunch Campaign GM tool',
    '',
    ...Object.values(COMMANDS).flatMap((command): readonly string[] => [
      `  gm ${command.usage}`,
      `      ${command.summary}`,
    ]),
    '',
    'Orders file: { "<player>": ["<order>", ...] }, one order per string:',
    ...ORDER_EXAMPLES.map((example): string => `  ${example}`),
    '',
  ].join('\n');
}

function startMatch(
  io: CliIo,
  path: string,
  seed: string,
  seats: readonly string[],
): void {
  refuseToOverwrite(io, path);
  const state = createInitialMatchState(CONFIG, seats.map(parseSeat), seed);
  saveMatch(io, path, {
    version: MATCH_FILE_VERSION,
    state,
    replayLog: [],
    spyLog: [],
  });
  io.print(
    [
      `Started ${path} with ${state.players.length} players. Honours this week: ${state.honourIds.join(', ')}.`,
      `It is ${dayLabelOf(state)}: send each player "gm view ${path} <player>", spy on request, then "gm resolve ${path} <orders.json>".`,
      '',
    ].join('\n'),
  );
}

function parseSeat(text: string, index: number): PlayerSeating {
  const match = SEAT.exec(text);
  if (match === null) {
    throw new CliError(`"${text}" is not <player>:<commander>`);
  }
  return {
    playerId: toPlayerId(group(match, 'playerId')),
    seat: FIRST_SEAT + index,
    commanderId: decodeOneOf(
      group(match, 'commanderId'),
      CONFIG.commanders.map((commander): string => commander.id),
      `the commander of ${group(match, 'playerId')}`,
    ),
  };
}

function sendSpy(io: CliIo, path: string, player: string, zone: string): void {
  const match = loadMatch(io, path);
  const outcome = spyOnZone(
    match.state,
    CONFIG,
    toPlayerId(player),
    toZoneId(zone),
  );
  if (outcome.kind === 'rejected') {
    throw new CliError(`No spy sent: ${SPY_REJECTIONS[outcome.reason]}`);
  }
  saveMatch(io, path, {
    ...match,
    state: outcome.state,
    spyLog: [...match.spyLog, outcome.report],
  });
  io.print(`${renderSpyReport(outcome.report)}\n`);
}

function resolveNight(io: CliIo, path: string, ordersPath: string): void {
  const match = loadMatch(io, path);
  requireMatchRunning(match.state, path);
  const orders = parseOrdersFile(
    readExistingFile(io, ordersPath),
    ordersPath,
    match.state,
  );
  const night = resolveTurn(match.state, orders, CONFIG);
  saveMatch(io, path, {
    ...match,
    state: night.state,
    replayLog: [...match.replayLog, ...night.replayLog],
  });
  io.print(nightReport(match.state, night, path));
}

function requireMatchRunning(state: MatchState, path: string): void {
  if (isMatchFinished(state, CONFIG)) {
    throw new CliError(`The match is over: gm score ${path}`);
  }
}

/** For the GM: which orders the engine rejected, and what to do next. */
function nightReport(
  before: MatchState,
  night: TurnResult,
  path: string,
): string {
  const rejections = night.replayLog.filter(
    (event): boolean => event.type === 'OrderRejected',
  );
  return [
    `Resolved ${dayLabelOf(before)} night. Orders rejected: ${rejections.length}.`,
    ...rejections.flatMap(narrateRejection),
    nextStep(night.state, path),
    '',
  ].join('\n');
}

function narrateRejection(event: ReplayEvent): readonly string[] {
  return narrateVisibleEvent({ visibility: 'full', event }).map(
    (line): string => `  ${line}`,
  );
}

function nextStep(state: MatchState, path: string): string {
  return isMatchFinished(state, CONFIG)
    ? `The week is over: gm score ${path}`
    : `It is ${dayLabelOf(state)}: send each player "gm view ${path} <player>".`;
}

function printFinalScore(io: CliIo, match: MatchFile): void {
  if (!isMatchFinished(match.state, CONFIG)) {
    throw new CliError(
      `The match is not over: it is ${dayLabelOf(match.state)}`,
    );
  }
  io.print(
    `${renderFinalScore(
      scoreMatch(logsOf(match), match.state.honourIds, CONFIG),
    ).join('\n')}\n`,
  );
}

function dayLabelOf(state: MatchState): string {
  return requirePresent(
    CONFIG.schedule[state.turnNumber - 1],
    `schedule entry for turn ${state.turnNumber}`,
  ).label;
}
