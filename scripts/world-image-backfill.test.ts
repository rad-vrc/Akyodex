import assert from "node:assert/strict";
import test from "node:test";

import {
  buildWorldImageBackfillTargets,
  normalizeAkyoJsonPayload,
} from "./world-image-backfill";

test("normalizeAkyoJsonPayload unwraps wrapped data arrays", () => {
  const payload = {
    data: [
      {
        id: "0746",
        entryType: "world",
        nickname: "World Entry",
        avatarName: "",
        category: "ワールド",
        comment: "",
        author: "Author",
        sourceUrl: "https://vrchat.com/home/world/wrld_world",
        avatarUrl: "https://vrchat.com/home/world/wrld_world",
      },
    ],
  };

  const normalized = normalizeAkyoJsonPayload(payload);
  assert.equal(normalized.length, 1);
  assert.equal(normalized[0]?.id, "0746");
});

test("buildWorldImageBackfillTargets includes explicit and legacy world entries", () => {
  const targets = buildWorldImageBackfillTargets([
    {
      id: "0746",
      entryType: "world",
      displaySerial: "0001",
      appearance: "",
      nickname: "Explicit World",
      avatarName: "",
      category: "ワールド",
      comment: "",
      author: "Author",
      attribute: "ワールド",
      notes: "",
      creator: "Author",
      sourceUrl: "https://vrchat.com/home/world/wrld_explicit",
      avatarUrl: "https://vrchat.com/home/world/wrld_explicit",
    },
    {
      id: "0747",
      appearance: "",
      nickname: "Legacy World",
      avatarName: "",
      category: "展示/ワールド",
      comment: "",
      author: "Author",
      attribute: "展示/ワールド",
      notes: "",
      creator: "Author",
      sourceUrl: "https://vrchat.com/home/world/wrld_legacy",
      avatarUrl: "https://vrchat.com/home/world/wrld_legacy",
    },
    {
      id: "0001",
      entryType: "avatar",
      appearance: "",
      nickname: "Avatar",
      avatarName: "Avatar Name",
      category: "チョコミント類",
      comment: "",
      author: "Author",
      attribute: "チョコミント類",
      notes: "",
      creator: "Author",
      sourceUrl: "https://vrchat.com/home/avatar/avtr_avatar",
      avatarUrl: "https://vrchat.com/home/avatar/avtr_avatar",
    },
  ]);

  assert.deepEqual(targets, [
    {
      displayName: "Explicit World",
      id: "0746",
      sourceUrl: "https://vrchat.com/home/world/wrld_explicit",
      wrld: "wrld_explicit",
    },
    {
      displayName: "Legacy World",
      id: "0747",
      sourceUrl: "https://vrchat.com/home/world/wrld_legacy",
      wrld: "wrld_legacy",
    },
  ]);
});

test("buildWorldImageBackfillTargets skips duplicates and worlds without wrld ids", () => {
  const targets = buildWorldImageBackfillTargets([
    {
      id: "0746",
      entryType: "world",
      appearance: "",
      nickname: "World A",
      avatarName: "",
      category: "ワールド",
      comment: "",
      author: "Author",
      attribute: "ワールド",
      notes: "",
      creator: "Author",
      sourceUrl: "https://vrchat.com/home/world/wrld_dup",
      avatarUrl: "https://vrchat.com/home/world/wrld_dup",
    },
    {
      id: "0746",
      entryType: "world",
      appearance: "",
      nickname: "World A duplicate",
      avatarName: "",
      category: "ワールド",
      comment: "",
      author: "Author",
      attribute: "ワールド",
      notes: "",
      creator: "Author",
      sourceUrl: "https://vrchat.com/home/world/wrld_dup",
      avatarUrl: "https://vrchat.com/home/world/wrld_dup",
    },
    {
      id: "0748",
      entryType: "world",
      appearance: "",
      nickname: "Missing URL",
      avatarName: "",
      category: "ワールド",
      comment: "",
      author: "Author",
      attribute: "ワールド",
      notes: "",
      creator: "Author",
      sourceUrl: "",
      avatarUrl: "",
    },
  ]);

  assert.deepEqual(targets, [
    {
      displayName: "World A",
      id: "0746",
      sourceUrl: "https://vrchat.com/home/world/wrld_dup",
      wrld: "wrld_dup",
    },
  ]);
});
