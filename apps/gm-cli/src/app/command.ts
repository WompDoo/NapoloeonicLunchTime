import type { CliIo } from './cli-io';
import { CliError } from './cli-error';

export interface CommandCall<TParameter extends string> {
  readonly args: Readonly<Record<TParameter, string>>;
  /** Arguments after the named ones, for commands that take a list. */
  readonly rest: readonly string[];
  readonly io: CliIo;
}

export interface CommandDefinition<TParameter extends string> {
  readonly usage: string;
  readonly summary: string;
  readonly parameters: readonly TParameter[];
  /** Whether more arguments may follow the named ones. */
  readonly takesList: boolean;
  readonly run: (call: CommandCall<TParameter>) => void;
}

export interface Command {
  readonly usage: string;
  readonly summary: string;
  readonly invoke: (args: readonly string[], io: CliIo) => void;
}

/** Checks the argument count, then hands the command its arguments by name. */
export function defineCommand<const TParameter extends string>(
  definition: CommandDefinition<TParameter>,
): Command {
  return {
    usage: definition.usage,
    summary: definition.summary,
    invoke: (args, io): void => {
      requireArgumentCount(definition, args);
      definition.run({
        args: namedArguments(definition.parameters, args),
        rest: args.slice(definition.parameters.length),
        io,
      });
    },
  };
}

function requireArgumentCount<TParameter extends string>(
  definition: CommandDefinition<TParameter>,
  args: readonly string[],
): void {
  if (!acceptsArgumentCount(definition, args.length)) {
    throw new CliError(`Usage: gm ${definition.usage}`);
  }
}

function acceptsArgumentCount<TParameter extends string>(
  definition: CommandDefinition<TParameter>,
  count: number,
): boolean {
  return (
    count >= definition.parameters.length &&
    count <= maximumArguments(definition)
  );
}

function maximumArguments<TParameter extends string>(
  definition: CommandDefinition<TParameter>,
): number {
  return definition.takesList
    ? Number.POSITIVE_INFINITY
    : definition.parameters.length;
}

/** Safe once the count is checked: every name has its argument. */
function namedArguments<TParameter extends string>(
  parameters: readonly TParameter[],
  args: readonly string[],
): Readonly<Record<TParameter, string>> {
  return Object.fromEntries(
    parameters.map((parameter, index): readonly [TParameter, string] => [
      parameter,
      args.slice(index, index + 1).join(''),
    ]),
  ) as Record<TParameter, string>;
}
