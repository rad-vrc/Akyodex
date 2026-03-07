import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./loading.tsx", import.meta.url), "utf8");

test("zukan loading state announces progress through a live region", () => {
  assert.match(source, /role="status"/);
  assert.match(source, /aria-live="polite"/);
});
