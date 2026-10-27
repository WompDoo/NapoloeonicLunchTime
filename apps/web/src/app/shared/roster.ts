import type { PlayingMatchDto } from '@lunch-campaign/contracts';
import type { Translator } from '../core/i18n/translator';

/** Who is who in a running match: names from the lobby, seats from the view. */
export interface Roster {
  /** The player's name; the viewer's is marked as theirs. */
  readonly nameOf: (playerId: string) => string;
  /** A zone owner's name, or "Neutral". */
  readonly ownerOf: (ownerId: string | null) => string;
  readonly seatOf: (playerId: string) => number | null;
  /** The CSS colour token of the player's seat, or the neutral colour. */
  readonly colourOf: (playerId: string | null) => string;
}

const NEUTRAL_COLOUR = 'var(--neutral-zone)';

export function rosterOf(
  match: PlayingMatchDto,
  translator: Translator,
): Roster {
  const names = new Map(
    match.roster.map((entry): [string, string] => [
      entry.playerId as string,
      entry.name,
    ]),
  );
  const seats = new Map(
    match.view.players.map((player): [string, number] => [
      player.playerId as string,
      player.seat,
    ]),
  );
  const plainName = (playerId: string): string =>
    names.get(playerId) ?? playerId;
  const nameOf = (playerId: string): string =>
    playerId === match.view.viewerId
      ? translator.translate('common.youName', { name: plainName(playerId) })
      : plainName(playerId);
  return {
    nameOf,
    ownerOf: (ownerId): string =>
      ownerId === null ? translator.translate('map.neutral') : nameOf(ownerId),
    seatOf: (playerId): number | null => seats.get(playerId) ?? null,
    colourOf: (playerId): string =>
      seatColour(playerId === null ? undefined : seats.get(playerId)),
  };
}

function seatColour(seat: number | undefined): string {
  return seat === undefined ? NEUTRAL_COLOUR : `var(--seat-${seat})`;
}
