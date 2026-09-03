/**
 * Thin wrapper — prefer `npm run upload-drive:overwrite`.
 * Forwards args to upload-drive.mjs with --overwrite.
 */
import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadScript = path.join(__dirname, "upload-drive.mjs");
const args = process.argv.slice(2);
if (!args.includes("--overwrite") && !args.includes("--force")) {
  args.push("--overwrite");
}

const child = spawn(process.execPath, [uploadScript, ...args], {
  stdio: "inherit",
  env: process.env,
});
child.on("exit", (code) => process.exit(code ?? 1));
