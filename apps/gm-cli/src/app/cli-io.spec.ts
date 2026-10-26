import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { nodeIo } from './cli-io';

describe('nodeIo', () => {
  const directory = mkdtempSync(join(tmpdir(), 'gm-cli-'));
  const io = nodeIo();

  afterAll(() => {
    rmSync(directory, { recursive: true, force: true });
  });

  it('reads and writes files', () => {
    const path = join(directory, 'week.json');
    expect(io.exists(path)).toBe(false);
    io.writeText(path, '{}\n');
    expect(io.exists(path)).toBe(true);
    expect(io.readText(path)).toBe('{}\n');
  });

  it('prints to stdout and errors to stderr', () => {
    const stdout = jest.spyOn(process.stdout, 'write').mockReturnValue(true);
    const stderr = jest.spyOn(process.stderr, 'write').mockReturnValue(true);
    io.print('view\n');
    io.printError('oops\n');
    expect(stdout).toHaveBeenCalledWith('view\n');
    expect(stderr).toHaveBeenCalledWith('oops\n');
    stdout.mockRestore();
    stderr.mockRestore();
  });
});
