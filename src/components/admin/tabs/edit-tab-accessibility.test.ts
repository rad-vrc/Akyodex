import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./edit-tab.tsx", import.meta.url), "utf8");

test("edit tab table headers declare scope for each column", () => {
  const scopedHeaders = source.match(/<th scope="col"/g) ?? [];
  assert.equal(scopedHeaders.length, 6);
});

test("edit tab search input is programmatically labeled", () => {
  assert.match(source, /<label htmlFor="edit-tab-search"/);
  assert.match(source, /id="edit-tab-search"/);
});
