import { buildSync } from "esbuild";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const directory = mkdtempSync(join(tmpdir(), "golden-reel-check-"));
const output = join(directory, "check.mjs");
try {
  buildSync({
    absWorkingDir: root,
    entryPoints: ["tests/golden-reel-layout.ts"],
    bundle: true,
    platform: "node",
    format: "esm",
    outfile: output,
  });
  await import(pathToFileURL(output).href);
} finally {
  rmSync(directory, { recursive: true, force: true });
}
