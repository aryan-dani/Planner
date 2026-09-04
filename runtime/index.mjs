/**
 * runtime/index.mjs
 * Unified entry point for the Academic OS Runtime CLI.
 * Routes commands to appropriate libraries and tools.
 */

import { listBuckets, listAllFiles, buildFileTree } from "./lib/storage.mjs";
import { summarize } from "./lib/pdf.mjs";
import syncProject from "./tools/sync-drive.mjs";
import indexContent from "./tools/index-content.mjs";
import purgeCache from "./tools/purge-cache.mjs";
import doctor from "./tools/doctor.mjs";

function parseFlag(args, name) {
  const eq = args.find((a) => a.startsWith(`--${name}=`));
  if (eq) return eq.slice(`--${name}=`.length);
  const idx = args.indexOf(`--${name}`);
  if (idx >= 0 && args[idx + 1] && !args[idx + 1].startsWith("-")) {
    return args[idx + 1];
  }
  return null;
}

const helpText = `
Academic OS Runtime CLI (Firebase Backend)

Usage:
  node runtime/index.mjs [command] [args]

Commands:
  help              Show this help menu
  buckets           List all storage buckets
  files <bucket>    List all files in a bucket (recursive tree)
  pdf <bucket> <path> Extract text and metadata from a PDF
  search <term>     Search all PDFs locally in 'course-content' for a term
  sync              Synchronize Google Drive with Firestore database
                      --subject=<name>  Limit sync + prune to matching subjects
                      --dry-run         Print actions without writing
  index             Index resource contents into Firestore for RAG search
                      --shrink-content  Truncate oversized resource_content
                                        fields to 6k chars (no full reindex)
  purge-cache       Purge expired semantic cache entries
  doctor            Check env vars + Firestore collection health
  
Examples:
  node runtime/index.mjs files course-content
  node runtime/index.mjs sync
  node runtime/index.mjs sync --subject=ML --dry-run
  node runtime/index.mjs doctor
  node runtime/index.mjs index
  node runtime/index.mjs purge-cache
`;

async function main() {
  const [cmd, ...args] = process.argv.slice(2);

  if (!cmd) {
    console.log(helpText);
    return;
  }

  try {
    switch (cmd) {
      case "help":
      case "--help":
      case "-h":
        console.log(helpText);
        break;

      case "buckets": {
        const b = await listBuckets();
        console.log(`\n📦 STORAGE BUCKETS:\n`);
        b.forEach((bucket) => console.log(` - ${bucket.name}`));
        console.log("");
        break;
      }

      case "files": {
        const bucket = args[0] || "course-content";
        const files = await listAllFiles(bucket);
        console.log(`\n📂 FILE TREE: ${bucket}\n`);
        console.log(JSON.stringify(buildFileTree(files), null, 2));
        console.log(`\nTotal files: ${files.length}\n`);
        break;
      }

      case "pdf": {
        if (args.length < 2) throw new Error("Bucket and path required.");
        console.log(`\n📄 Extracting PDF: ${args[1]}...`);
        const result = await summarize(
          await (await import("./lib/storage.mjs")).downloadFile(args[0], args[1]),
        );
        console.log(`\nPages: ${result.pages}`);
        console.log(`Metadata:`, result.metadata);
        console.log(`\nText Preview:\n${"-".repeat(20)}\n${result.summary}\n`);
        break;
      }

      case "search": {
        if (!args[0]) throw new Error("Search term required.");
        const { searchAll } = await import("./tools/search-pdfs.mjs");
        await searchAll(args[1] || "course-content", args[0]);
        break;
      }

      case "sync": {
        await syncProject({
          subject: parseFlag(args, "subject"),
          dryRun: args.includes("--dry-run"),
        });
        break;
      }

      case "index": {
        await indexContent({
          shrinkContent: args.includes("--shrink-content"),
        });
        break;
      }

      case "purge-cache": {
        await purgeCache();
        break;
      }

      case "doctor": {
        await doctor();
        break;
      }

      default:
        console.error(`Unknown command: ${cmd}`);
        console.log(helpText);
        process.exitCode = 1;
    }
  } catch (error) {
    console.error(`\n❌ Error: ${error.message}\n`);
    process.exitCode = 1;
  }
}

main();
