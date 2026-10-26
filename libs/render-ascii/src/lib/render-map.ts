import type {
  ArmyVisibility,
  PlayerId,
  PlayerView,
  ZoneConnection,
  ZoneKind,
  ZonePosition,
  ZoneView,
} from '@lunch-campaign/player-view';
import {
  describeCount,
  describeUnits,
  requireFound,
  UNIT_LEGEND,
} from './text';

const KIND_MARKERS: Readonly<Record<ZoneKind, string>> = {
  capital: '*',
  city: 'o',
  plain: ' ',
};
const NEUTRAL = '--';
const HIDDEN = '?';
const CONNECTOR_WIDTH = 3;
const HORIZONTAL_LINK = '-'.repeat(CONNECTOR_WIDTH);
const NO_LINK = ' '.repeat(CONNECTOR_WIDTH);
/** A box line is "| " + text + " |": a space and a wall on each side of the text. */
const SPACES_AROUND_TEXT = 2;
const WALLS = 2;
const BOX_FRAME_WIDTH = SPACES_AROUND_TEXT + WALLS;
const SIDES = 2;
const NO_ZONE_ID = '';

type ArmyTexts = {
  readonly [TKind in ArmyVisibility['kind']]: (
    army: Extract<ArmyVisibility, { readonly kind: TKind }>,
  ) => string;
};

const ARMY_TEXTS: ArmyTexts = {
  hidden: (): string => HIDDEN,
  count: (army): string => describeCount(army.count),
  composition: (army): string => describeUnits(army.units),
};

type Cell = ZoneView | undefined;

/** A box holds two lines: the zone, then its army. */
type CellLine = 0 | 1;
const ZONE_LINE: CellLine = 0;
const ARMY_LINE: CellLine = 1;

interface Grid {
  readonly view: PlayerView;
  readonly columns: readonly number[];
  readonly textWidth: number;
  readonly links: ReadonlySet<string>;
}

/**
 * The map as a grid of boxes by zone position, one box per zone: id, kind marker and owner's seat, then the
 * army as far as the viewer may see it. "---" and "|" between boxes are connections.
 */
export function renderMap(view: PlayerView): readonly string[] {
  const grid: Grid = {
    view,
    columns: oneTo(maxOf(view.zones, (position): number => position.column)),
    textWidth: Math.max(
      ...view.zones.flatMap((zone): readonly number[] =>
        cellText(zone, view).map((line): number => line.length),
      ),
    ),
    links: new Set(
      view.connections.flatMap((connection): readonly string[] => [
        linkKey(connection[0], connection[1]),
        linkKey(connection[1], connection[0]),
      ]),
    ),
  };
  const rows = oneTo(maxOf(view.zones, (position): number => position.row));
  return [
    ...rows.flatMap((row): readonly string[] => [
      ...renderRow(grid, row),
      ...verticalLinks(grid, row),
    ]),
    ...offGridConnections(view),
    ...legend(view),
  ];
}

function renderRow(grid: Grid, row: number): readonly string[] {
  const cells = grid.columns.map(
    (column): Cell => zoneAt(grid.view, row, column),
  );
  const border = joinCells(
    cells.map((cell): string =>
      boxed(
        grid,
        cell,
        (): string => `+${'-'.repeat(grid.textWidth + SPACES_AROUND_TEXT)}+`,
      ),
    ),
    NO_LINK,
  );
  return [
    border,
    joinLinked(
      grid,
      cells,
      cells.map((cell): string => boxedLine(grid, cell, ZONE_LINE)),
    ),
    joinCells(
      cells.map((cell): string => boxedLine(grid, cell, ARMY_LINE)),
      NO_LINK,
    ),
    border,
  ];
}

/** The "|" under each box connected to the box below it; nothing after the last row. */
function verticalLinks(grid: Grid, row: number): readonly string[] {
  const line = grid.columns
    .map((column): string =>
      centred(
        isLinked(
          grid,
          zoneAt(grid.view, row, column),
          zoneAt(grid.view, row + 1, column),
        )
          ? '|'
          : ' ',
        grid.textWidth + BOX_FRAME_WIDTH,
      ),
    )
    .join(NO_LINK)
    .trimEnd();
  return line === '' ? [] : [line];
}

function boxedLine(grid: Grid, cell: Cell, line: CellLine): string {
  return boxed(
    grid,
    cell,
    (zone): string =>
      `| ${cellText(zone, grid.view)[line].padEnd(grid.textWidth)} |`,
  );
}

function boxed(
  grid: Grid,
  cell: Cell,
  draw: (zone: ZoneView) => string,
): string {
  return cell === undefined
    ? ' '.repeat(grid.textWidth + BOX_FRAME_WIDTH)
    : draw(cell);
}

function joinCells(pieces: readonly string[], separator: string): string {
  return pieces.join(separator).trimEnd();
}

/** Joins a row's first text line with "---" between connected neighbours. */
function joinLinked(
  grid: Grid,
  cells: readonly Cell[],
  pieces: readonly string[],
): string {
  return pieces
    .map((piece, column): string =>
      column === 0
        ? piece
        : `${linkBetween(grid, cells[column - 1], cells[column])}${piece}`,
    )
    .join('')
    .trimEnd();
}

function linkBetween(grid: Grid, left: Cell, right: Cell): string {
  return isLinked(grid, left, right) ? HORIZONTAL_LINK : NO_LINK;
}

function isLinked(grid: Grid, from: Cell, to: Cell): boolean {
  return grid.links.has(linkKey(zoneIdOf(from), zoneIdOf(to)));
}

function zoneIdOf(cell: Cell): string {
  return cell === undefined ? NO_ZONE_ID : cell.zoneId;
}

function linkKey(from: string, to: string): string {
  return `${from}|${to}`;
}

function cellText(zone: ZoneView, view: PlayerView): readonly [string, string] {
  const describeArmy = ARMY_TEXTS[zone.army.kind] as (
    army: ArmyVisibility,
  ) => string;
  return [
    `${zone.zoneId} ${KIND_MARKERS[zone.kind]} ${ownerLabel(zone.ownerId, view)}`,
    describeArmy(zone.army),
  ];
}

function ownerLabel(ownerId: PlayerId | null, view: PlayerView): string {
  return ownerId === null ? NEUTRAL : seatLabel(view, ownerId);
}

/** "P1" for the player in seat 1. */
export function seatLabel(view: PlayerView, playerId: PlayerId): string {
  const player = requireFound(
    view.players.find((candidate): boolean => candidate.playerId === playerId),
    `player ${playerId}`,
  );
  return `P${player.seat}`;
}

function zoneAt(view: PlayerView, row: number, column: number): Cell {
  return view.zones.find(
    (zone): boolean =>
      zone.position.row === row && zone.position.column === column,
  );
}

/** Connections the grid cannot draw: between zones that are not next to each other. */
function offGridConnections(view: PlayerView): readonly string[] {
  const hidden = view.connections.filter(
    (connection): boolean => !areGridNeighbours(view, connection),
  );
  return hidden.length === 0
    ? []
    : [
        `Also connected: ${hidden.map((connection): string => connection.join('-')).join(', ')}`,
      ];
}

function areGridNeighbours(
  view: PlayerView,
  connection: ZoneConnection,
): boolean {
  const [from, to] = connection.map(
    (zoneId): ZonePosition =>
      requireFound(
        view.zones.find((zone): boolean => zone.zoneId === zoneId),
        `zone ${zoneId}`,
      ).position,
  );
  return (
    gridDistance(
      requireFound(from, 'connection start'),
      requireFound(to, 'connection end'),
    ) === 1
  );
}

function gridDistance(from: ZonePosition, to: ZonePosition): number {
  return Math.abs(from.row - to.row) + Math.abs(from.column - to.column);
}

function legend(view: PlayerView): readonly string[] {
  return [
    `* capital, o city. P1-P${view.players.length}: seats (see Players).`,
    `Armies: ${UNIT_LEGEND}.${view.unitCountsVisible ? '' : ' ? = hidden by fog today.'}`,
  ];
}

function centred(text: string, width: number): string {
  return text.padStart(Math.ceil((width + text.length) / SIDES)).padEnd(width);
}

function maxOf(
  zones: readonly ZoneView[],
  read: (position: ZonePosition) => number,
): number {
  return Math.max(...zones.map((zone): number => read(zone.position)));
}

function oneTo(count: number): readonly number[] {
  return Array.from({ length: count }, (_, index): number => index + 1);
}
