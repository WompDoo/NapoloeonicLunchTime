import type {
  HonourAward,
  HonourStandingEntry,
  HonourStandingView,
  MatchScore,
  PlayerFinalScore,
  PlayerView,
  PublicPlayerView,
} from '@lunch-campaign/player-view';
import { narrateVisibleEvent } from './narrate-night';
import { renderMap, seatLabel } from './render-map';
import { renderSpyReport } from './render-spy-report';
import { formatNumber, formatTable, listText, section } from './text';

const BLANK_LINE = '';

/** Everything one player may see, as plain text. Reads the view only. */
export function renderPlayerView(view: PlayerView): string {
  return [
    header(view),
    section('Map', renderMap(view)),
    section('Players', playersTable(view)),
    section('Honours', honourLines(view.honours)),
    section('Spy reports today', spyReportLines(view)),
    section('Last night', lastNightLines(view)),
    ...finalScoreSections(view.finalScore),
  ]
    .map((lines): string => lines.join('\n'))
    .join(`\n${BLANK_LINE}\n`)
    .concat('\n');
}

function header(view: PlayerView): readonly string[] {
  return [
    `LUNCH CAMPAIGN - ${dayText(view)}, as seen by ${view.viewerId}`,
    `Supply: ${view.me.supply}. ${spiesText(view)}`,
    eventsText(view.activeEventIds),
  ];
}

function dayText(view: PlayerView): string {
  return view.dayLabel === null
    ? 'the match is over'
    : `${view.dayLabel} (turn ${view.turnNumber})`;
}

function spiesText(view: PlayerView): string {
  return view.spiesAvailable
    ? `A spy costs ${view.spyCost} supply.`
    : 'No spies today.';
}

function eventsText(activeEventIds: readonly string[]): string {
  return activeEventIds.length === 0
    ? 'No event in play.'
    : `In play: ${activeEventIds.join(', ')}.`;
}

function playersTable(view: PlayerView): readonly string[] {
  return formatTable(
    view.players.map((player): readonly string[] => playerRow(view, player)),
  );
}

function playerRow(
  view: PlayerView,
  player: PublicPlayerView,
): readonly string[] {
  return [
    seatLabel(view, player.playerId),
    `${player.playerId}${youText(view, player)}`,
    player.commanderId,
    `${player.score} pts`,
    player.abilityUsed ? 'ability used' : 'ability ready',
    upgradesText(player),
    eliminatedText(player),
  ];
}

function youText(view: PlayerView, player: PublicPlayerView): string {
  return player.playerId === view.viewerId ? ' (you)' : '';
}

function eliminatedText(player: PublicPlayerView): string {
  return player.eliminated ? 'eliminated' : '';
}

function upgradesText(player: PublicPlayerView): string {
  return player.upgrades.length === 0
    ? 'no upgrades'
    : player.upgrades.join(', ');
}

function honourLines(
  honours: readonly HonourStandingView[],
): readonly string[] {
  return honours.length === 0
    ? ['No honours drawn.']
    : honours.flatMap(honourStanding);
}

function honourStanding(honour: HonourStandingView): readonly string[] {
  return [
    `${honour.honourId} (${honour.points} pts): ${leadersText(honour)}`,
    ...entriesLines(honour.entries),
  ];
}

function leadersText(honour: HonourStandingView): string {
  return honour.entries.length === 0
    ? 'not contested yet'
    : leadingText(honour);
}

function leadingText(honour: HonourStandingView): string {
  return honour.leaderIds.length === 0
    ? 'nobody would earn it yet'
    : `${listText(honour.leaderIds)} leading`;
}

function entriesLines(
  entries: readonly HonourStandingEntry[],
): readonly string[] {
  return entries.length === 0 ? [] : [`  ${entries.map(entryText).join(', ')}`];
}

function entryText(entry: HonourStandingEntry): string {
  return `${entry.playerId} ${formatNumber(entry.value)}${entry.eligible ? '' : ' (not eligible)'}`;
}

function spyReportLines(view: PlayerView): readonly string[] {
  return view.spyReports.length === 0
    ? ['None.']
    : view.spyReports.map(renderSpyReport);
}

function lastNightLines(view: PlayerView): readonly string[] {
  return view.lastNight.length === 0
    ? ['No night resolved yet.']
    : view.lastNight.flatMap(narrateVisibleEvent);
}

function finalScoreSections(
  score: MatchScore | null,
): readonly (readonly string[])[] {
  return score === null
    ? []
    : [section('Final score', renderFinalScore(score))];
}

/** The winner, the ranking and who earned each honour. */
export function renderFinalScore(score: MatchScore): readonly string[] {
  return [
    `${score.winnerIds.length === 1 ? 'Winner' : 'Shared victory'}: ${listText(score.winnerIds)}`,
    ...formatTable(score.players.map(finalScoreRow)),
    ...score.honours.map(awardText),
  ];
}

function finalScoreRow(player: PlayerFinalScore): readonly string[] {
  return [
    `${player.rank}.`,
    player.playerId,
    `${player.total} pts`,
    `${player.cityPoints} from cities`,
    `${player.honourPoints} from honours`,
  ];
}

function awardText(award: HonourAward): string {
  return `${award.honourId}: ${award.winnerIds.length === 0 ? 'nobody' : listText(award.winnerIds)}`;
}
