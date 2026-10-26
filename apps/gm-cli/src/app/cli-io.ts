import { existsSync, readFileSync, writeFileSync } from 'node:fs';

/** Everything the CLI does to the outside world. Commands receive it, so tests run them in memory. */
export interface CliIo {
  readonly exists: (path: string) => boolean;
  readonly readText: (path: string) => string;
  readonly writeText: (path: string, text: string) => void;
  readonly print: (text: string) => void;
  readonly printError: (text: string) => void;
}

export function nodeIo(): CliIo {
  return {
    exists: (path): boolean => existsSync(path),
    readText: (path): string => readFileSync(path, 'utf8'),
    writeText: (path, text): void => {
      writeFileSync(path, text, 'utf8');
    },
    print: (text): void => {
      process.stdout.write(text);
    },
    printError: (text): void => {
      process.stderr.write(text);
    },
  };
}
