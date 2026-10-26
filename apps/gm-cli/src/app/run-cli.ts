import type { CliIo } from './cli-io';
import { CliError } from './cli-error';
import type { Command } from './command';
import { COMMANDS, helpText } from './commands';

export const EXIT_SUCCESS = 0;
export const EXIT_FAILURE = 1;

/** Runs one command. Every failure is printed for the GM and gives a failing exit code; nothing is swallowed. */
export function runCli(args: readonly string[], io: CliIo): number {
  try {
    runCommand(args, io);
    return EXIT_SUCCESS;
  } catch (error) {
    io.printError(`${messageOf(error)}\n`);
    return EXIT_FAILURE;
  }
}

function runCommand(args: readonly string[], io: CliIo): void {
  const [name = 'help', ...rest] = args;
  findCommand(name).invoke(rest, io);
}

function findCommand(name: string): Command {
  const command = COMMANDS[name];
  if (command === undefined) {
    throw new CliError(`Unknown command "${name}".\n\n${helpText()}`);
  }
  return command;
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
