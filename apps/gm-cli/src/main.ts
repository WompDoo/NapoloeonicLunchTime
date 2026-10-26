import { nodeIo } from './app/cli-io';
import { runCli } from './app/run-cli';

const NODE_AND_SCRIPT_ARGUMENTS = 2;

process.exitCode = runCli(
  process.argv.slice(NODE_AND_SCRIPT_ARGUMENTS),
  nodeIo(),
);
