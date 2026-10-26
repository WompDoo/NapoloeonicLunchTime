import type { CliIo } from './cli-io';
import { CliError } from './cli-error';
import type { MatchFile } from './match-file';
import { decodeMatchFile, encodeMatchFile } from './match-file';

export function loadMatch(io: CliIo, path: string): MatchFile {
  return decodeMatchFile(readExistingFile(io, path), path);
}

export function saveMatch(io: CliIo, path: string, match: MatchFile): void {
  io.writeText(path, encodeMatchFile(match));
}

export function readExistingFile(io: CliIo, path: string): string {
  if (!io.exists(path)) {
    throw new CliError(`${path} does not exist`);
  }
  return io.readText(path);
}

/** A new match never replaces an existing one: delete the old file first if that is what you mean. */
export function refuseToOverwrite(io: CliIo, path: string): void {
  if (io.exists(path)) {
    throw new CliError(`${path} already exists; delete it first to start over`);
  }
}
