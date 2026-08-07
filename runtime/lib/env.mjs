import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Parse `.env.local` once for local CLI scripts (not present on Vercel). */
function loadFileEnv() {
  const envPath = join(__dirname, "..", "..", ".env.local");
  if (!existsSync(envPath)) {
    return {};
  }

  const content = readFileSync(envPath, "utf-8");
  const parsed = {};
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let value = trimmed.slice(eqIdx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    parsed[key] = value;
  }
  return parsed;
}

let fileEnvCache = null;

function getFileEnv() {
  if (fileEnvCache === null) {
    fileEnvCache = loadFileEnv();
  }
  return fileEnvCache;
}

/**
 * Read an env var at call time.
 * Prefer live `process.env` (Vercel runtime injection), then `.env.local` for local scripts.
 */
export function getEnv(key) {
  const live = process.env[key];
  if (live !== undefined && live !== "") return live;
  const fromFile = getFileEnv()[key];
  if (fromFile !== undefined && fromFile !== "") return fromFile;
  return live ?? fromFile;
}

/** Snapshot for CLI compatibility (`{ ...env }`); getters still resolve live via Proxy. */
export function loadEnv() {
  return new Proxy(
    {},
    {
      get(_target, prop) {
        if (typeof prop !== "string") return undefined;
        if (prop === "then") return undefined; // avoid thenable traps
        return getEnv(prop);
      },
      ownKeys() {
        return [
          ...new Set([
            ...Object.keys(process.env),
            ...Object.keys(getFileEnv()),
          ]),
        ];
      },
      getOwnPropertyDescriptor(_target, prop) {
        if (typeof prop !== "string") return undefined;
        const value = getEnv(prop);
        if (value === undefined) return undefined;
        return { configurable: true, enumerable: true, writable: false, value };
      },
      has(_target, prop) {
        return typeof prop === "string" && getEnv(prop) !== undefined;
      },
    },
  );
}

export const env = loadEnv();

export function cleanPrivateKey(key) {
  if (!key) return undefined;
  let cleaned = key.trim();
  if (
    (cleaned.startsWith('"') && cleaned.endsWith('"')) ||
    (cleaned.startsWith("'") && cleaned.endsWith("'"))
  ) {
    cleaned = cleaned.slice(1, -1);
  }
  return cleaned.replace(/\\n/g, "\n");
}
