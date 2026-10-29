import { nodeDeps, runSetPassword } from "../src/cli/set-password";
process.exitCode = await runSetPassword(process.argv.slice(2), nodeDeps());
