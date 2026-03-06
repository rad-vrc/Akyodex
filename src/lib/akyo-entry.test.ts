import assert from "node:assert/strict";
import test from "node:test";

import * as akyoEntryModuleNs from "./akyo-entry";

const akyoEntryModule =
  (akyoEntryModuleNs as { default?: Record<string, unknown> }).default ??
  (akyoEntryModuleNs as Record<string, unknown>);

const resolveDisplaySerialForSourceUrlChange =
  akyoEntryModule.resolveDisplaySerialForSourceUrlChange as
    | ((args: {
        currentDisplaySerial: string;
        detectedEntryType: "avatar" | "world" | null;
        id: string;
        originalDisplaySerial?: string;
        originalEntryType?: "avatar" | "world";
      }) => string)
    | undefined;

const getPublicDisplayId = akyoEntryModule.getPublicDisplayId as
  | ((entry: {
      id: string;
      entryType?: "avatar" | "world";
      displaySerial?: string;
      category?: string;
      attribute?: string;
      appearance: string;
      nickname: string;
      avatarName: string;
      comment: string;
      author: string;
      notes: string;
      creator: string;
      avatarUrl: string;
      sourceUrl?: string;
    }) => string)
  | undefined;

const getNextWorldDisplaySerial = akyoEntryModule.getNextWorldDisplaySerial as
  | ((
      entries: { entryType?: "avatar" | "world"; displaySerial?: string }[],
    ) => string)
  | undefined;

test("resolveDisplaySerialForSourceUrlChange resets stale world serials for avatar URLs", () => {
  assert.equal(typeof resolveDisplaySerialForSourceUrlChange, "function");

  assert.equal(
    resolveDisplaySerialForSourceUrlChange?.({
      currentDisplaySerial: "0042",
      detectedEntryType: "avatar",
      id: "0746",
    }),
    "0746",
  );
});

test("resolveDisplaySerialForSourceUrlChange preserves serials for world or unknown URLs", () => {
  assert.equal(typeof resolveDisplaySerialForSourceUrlChange, "function");

  assert.equal(
    resolveDisplaySerialForSourceUrlChange?.({
      currentDisplaySerial: "0042",
      detectedEntryType: "world",
      id: "0746",
    }),
    "0042",
  );
  assert.equal(
    resolveDisplaySerialForSourceUrlChange?.({
      currentDisplaySerial: "0042",
      detectedEntryType: null,
      id: "0746",
    }),
    "0042",
  );
});

test("getPublicDisplayId formats avatar and world public ids independently", () => {
  assert.equal(typeof getPublicDisplayId, "function");

  assert.equal(
    getPublicDisplayId?.({
      id: "0746",
      entryType: "avatar",
      displaySerial: "0746",
      appearance: "",
      nickname: "Avatar Akyo",
      avatarName: "Avatar Akyo",
      category: "",
      comment: "",
      author: "",
      attribute: "",
      notes: "",
      creator: "",
      avatarUrl: "https://vrchat.com/home/avatar/avtr_example",
      sourceUrl: "https://vrchat.com/home/avatar/avtr_example",
    }),
    "avatar0746",
  );

  assert.equal(
    getPublicDisplayId?.({
      id: "0799",
      entryType: "world",
      displaySerial: "0003",
      appearance: "",
      nickname: "World Akyo",
      avatarName: "",
      category: "ワールド",
      comment: "",
      author: "",
      attribute: "ワールド",
      notes: "",
      creator: "",
      avatarUrl: "https://vrchat.com/home/world/wrld_example",
      sourceUrl: "https://vrchat.com/home/world/wrld_example",
    }),
    "world0003",
  );
});

test("getNextWorldDisplaySerial appends after the highest existing world serial", () => {
  assert.equal(typeof getNextWorldDisplaySerial, "function");

  assert.equal(
    getNextWorldDisplaySerial?.([
      { entryType: "avatar", displaySerial: "0746" },
      { entryType: "world", displaySerial: "0001" },
      { entryType: "world", displaySerial: "0012" },
      { entryType: "world", displaySerial: "0007" },
    ]),
    "0013",
  );
});

test("getNextWorldDisplaySerial ignores invalid or missing world serials", () => {
  assert.equal(typeof getNextWorldDisplaySerial, "function");

  assert.equal(
    getNextWorldDisplaySerial?.([
      { entryType: "avatar", displaySerial: "0746" },
      { entryType: "world", displaySerial: "" },
      { entryType: "world" },
      { entryType: "world", displaySerial: "not-a-number" },
    ]),
    "0001",
  );
});

test("resolveDisplaySerialForSourceUrlChange restores the original world serial after toggling back from avatar", () => {
  assert.equal(typeof resolveDisplaySerialForSourceUrlChange, "function");

  assert.equal(
    resolveDisplaySerialForSourceUrlChange?.({
      currentDisplaySerial: "0746",
      detectedEntryType: "world",
      id: "0746",
      originalDisplaySerial: "0042",
      originalEntryType: "world",
    }),
    "0042",
  );
});
