describe('main', () => {
  const argv = process.argv;

  afterEach(() => {
    process.argv = argv;
    process.exitCode = undefined;
    jest.restoreAllMocks();
  });

  it.each([
    { args: ['help'], exitCode: 0, stream: 'stdout' as const },
    { args: ['fly'], exitCode: 1, stream: 'stderr' as const },
  ])(
    'runs the CLI with $args and sets exit code $exitCode',
    async ({ args, exitCode, stream }) => {
      const write = jest.spyOn(process[stream], 'write').mockReturnValue(true);
      process.argv = ['node', 'main.js', ...args];
      await jest.isolateModulesAsync(async () => {
        await import('./main');
      });
      expect(process.exitCode).toBe(exitCode);
      expect(write).toHaveBeenCalled();
    },
  );
});
