/**
 * Thin wrapper: overwrite files in a local tree onto Drive (path-scoped).
 * Prefer: npm run upload-drive:overwrite -- <dir>
 */
import { spawn } from "child_process";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const here = dirname(fileURLToPath(import.meta.url));
const upload = join(here, "upload-drive.mjs");
const extra = process.argv.slice(2);

const child = spawn(process.execPath, [upload, "--overwrite", ...extra], {
  stdio: "inherit",
});
child.on("exit", (code) => process.exit(code ?? 1));
