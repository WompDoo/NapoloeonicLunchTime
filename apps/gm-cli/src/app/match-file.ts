import type { MatchState, ReplayEvent } from '@lunch-campaign/engine';
import { decodeArray, decodeRecord } from '@lunch-campaign/engine';
import type { MatchLogs, SpyReport } from '@lunch-campaign/player-view';
import { CliError, parseJson } from './cli-error';

export const MATCH_FILE_VERSION = 1;
const JSON_INDENT = 2;

/** One match on disk: the engine state, every night's replay log and every spy report. */
export interface MatchFile {
  readonly version: typeof MATCH_FILE_VERSION;
  readonly state: MatchState;
  readonly replayLog: readonly ReplayEvent[];
  readonly spyLog: readonly SpyReport[];
}

export function encodeMatchFile(match: MatchFile): string {
  return `${JSON.stringify(match, null, JSON_INDENT)}\n`;
}

/**
 * Checks the envelope only. The contents are this CLI's own output; a hand-edited state the engine cannot
 * use fails loudly at the next command with the engine's own contract error.
 */
export function decodeMatchFile(text: string, path: string): MatchFile {
  const raw = decodeRecord(parseJson(text, path), path);
  requireVersion(raw['version'], path);
  return {
    version: MATCH_FILE_VERSION,
    state: decodeRecord(raw['state'], `${path}.state`) as unknown as MatchState,
    replayLog: decodeArray(
      raw['replayLog'],
      `${path}.replayLog`,
    ) as readonly ReplayEvent[],
    spyLog: decodeArray(
      raw['spyLog'],
      `${path}.spyLog`,
    ) as readonly SpyReport[],
  };
}

export function logsOf(match: MatchFile): MatchLogs {
  return { replayLog: match.replayLog, spyLog: match.spyLog };
}

function requireVersion(version: unknown, path: string): void {
  if (version !== MATCH_FILE_VERSION) {
    throw new CliError(
      `${path} is match file version ${String(version)}; this CLI reads version ${MATCH_FILE_VERSION}`,
    );
  }
}
