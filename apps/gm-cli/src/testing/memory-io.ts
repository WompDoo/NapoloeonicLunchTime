import type { CliIo } from '../app/cli-io';

/** A CliIo backed by a map of files, recording everything printed. */
export interface MemoryIo extends CliIo {
  readonly files: Map<string, string>;
  /** Everything printed since the last call, so each assertion sees one command's output. */
  readonly takePrinted: () => string;
  readonly printedErrors: () => string;
}

export function createMemoryIo(
  files: Readonly<Record<string, string>> = {},
): MemoryIo {
  const store = new Map(Object.entries(files));
  const output: string[] = [];
  const takeAll = (lines: string[]): string => lines.splice(0).join('');
  const errors: string[] = [];
  return {
    files: store,
    exists: (path): boolean => store.has(path),
    readText: (path): string => {
      const text = store.get(path);
      if (text === undefined) {
        throw new Error(`memory io: no file ${path}`);
      }
      return text;
    },
    writeText: (path, text): void => {
      store.set(path, text);
    },
    print: (text): void => {
      output.push(text);
    },
    printError: (text): void => {
      errors.push(text);
    },
    takePrinted: (): string => takeAll(output),
    printedErrors: (): string => errors.join(''),
  };
}
