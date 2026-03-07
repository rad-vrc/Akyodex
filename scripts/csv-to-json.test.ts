import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { pathToFileURL } from "node:url";

const SCRIPT_PATH = path.resolve("scripts/csv-to-json.ts");
const TEMP_ROOT = path.resolve("scripts", ".tmp-tests");

function buildCsv(rows: string[][]): string {
  return `${rows
    .map((row) => row.map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`).join(","))
    .join("\n")}\n`;
}

test("parseCsvToAkyoData normalizes EntryType before validating it", async () => {
  await mkdir(TEMP_ROOT, { recursive: true });
  const tempDir = await mkdtemp(path.join(TEMP_ROOT, "csv-to-json-test-"));

  try {
    const originalSource = await readFile(SCRIPT_PATH, "utf8");
    const patchedSource = `${originalSource.replace(
      /\/\/ Run if executed directly[\s\S]*$/,
      "",
    )}\nexport { parseCsvToAkyoData };\n`;
    const tempModulePath = path.join(tempDir, "csv-to-json.testable.ts");
    await writeFile(tempModulePath, patchedSource, "utf8");

    const imported = (await import(pathToFileURL(tempModulePath).href)) as {
      parseCsvToAkyoData: (csvText: string) => Array<{
        entryType?: "avatar" | "world";
      }>;
    };

    const csv = buildCsv([
      [
        "ID",
        "Nickname",
        "AvatarName",
        "Category",
        "Comment",
        "Author",
        "AvatarURL",
        "SourceURL",
        "EntryType",
        "DisplaySerial",
      ],
      [
        "0812",
        "World Entry",
        "",
        "ワールド",
        "",
        "Author",
        "https://vrchat.com/home/world/wrld_example",
        "https://vrchat.com/home/world/wrld_example",
        " World ",
        "0067",
      ],
      [
        "0813",
        "Avatar Entry",
        "Avatar Name",
        "チョコミント類",
        "",
        "Author",
        "https://vrchat.com/home/avatar/avtr_example",
        "",
        "Avatar",
        "",
      ],
    ]);

    const parsed = imported.parseCsvToAkyoData(csv);
    assert.equal(parsed[0]?.entryType, "world");
    assert.equal(parsed[1]?.entryType, "avatar");
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});
