import assert from "node:assert/strict";
import test from "node:test";

import { assertWorldRegistrationAssets } from "./world-registration";

test("assertWorldRegistrationAssets rejects registrations without world image", () => {
  assert.throws(
    () =>
      assertWorldRegistrationAssets({
        imageFile: null,
        resolvedAuthor: "Author",
        resolvedNickname: "World Name",
      }),
    /ワールド画像を取得できませんでした/,
  );
});

test("assertWorldRegistrationAssets rejects registrations without required metadata", () => {
  assert.throws(
    () =>
      assertWorldRegistrationAssets({
        imageFile: {} as File,
        resolvedAuthor: "",
        resolvedNickname: "World Name",
      }),
    /ワールド情報の自動取得が一部不足しました/,
  );
});
