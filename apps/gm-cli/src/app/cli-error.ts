/** A mistake in how the CLI was called or in a file it was given; the message tells the GM what to fix. */
export class CliError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = 'CliError';
  }
}

/** JSON.parse with the file named in the error. */
export function parseJson(text: string, path: string): unknown {
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new CliError(
      `${path} is not valid JSON: ${(error as Error).message}`,
    );
  }
}
