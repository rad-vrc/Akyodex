import assert from "node:assert/strict";
import test from "node:test";

import * as useAkyoDataModuleNs from "./use-akyo-data";

const useAkyoDataModule =
  (useAkyoDataModuleNs as { default?: Record<string, unknown> }).default ??
  (useAkyoDataModuleNs as Record<string, unknown>);

const applyFavoriteOverrides = useAkyoDataModule.applyFavoriteOverrides as
  | ((persistedFavoriteIds: readonly string[], overrides: Record<string, boolean>) => string[])
  | undefined;
const pruneFavoriteOverrides = useAkyoDataModule.pruneFavoriteOverrides as
  | ((persistedFavoriteIds: readonly string[], overrides: Record<string, boolean>) => Record<string, boolean>)
  | undefined;
const reconcileFavoriteOverride = useAkyoDataModule.reconcileFavoriteOverride as
  | ((args: {
      persistedFavoriteIds: readonly string[];
      overrides: Record<string, boolean>;
      id: string;
      nextIsFavorite: boolean;
    }) => Record<string, boolean>)
  | undefined;
const syncFavoriteCollections = useAkyoDataModule.syncFavoriteCollections as
  | ((args: {
      data: Array<{ id: string; isFavorite?: boolean }>;
      filteredData: Array<{ id: string; isFavorite?: boolean }>;
      favoriteIds: readonly string[];
    }) => {
      nextData: Array<{ id: string; isFavorite?: boolean }>;
      nextFilteredData: Array<{ id: string; isFavorite?: boolean }>;
    })
  | undefined;
const getNextFavoritePersistRetryDelayMs =
  useAkyoDataModule.getNextFavoritePersistRetryDelayMs as
    | ((previousDelayMs: number | null) => number)
    | undefined;

test("applyFavoriteOverrides keeps pending local favorites on top of fresher storage data", () => {
  assert.equal(typeof applyFavoriteOverrides, "function");

  assert.deepEqual(
    applyFavoriteOverrides?.(["0001", "0003"], { "0002": true }),
    ["0001", "0002", "0003"],
  );
});

test("pruneFavoriteOverrides clears overrides once storage already matches the desired state", () => {
  assert.equal(typeof pruneFavoriteOverrides, "function");

  assert.deepEqual(
    pruneFavoriteOverrides?.([], { "0001": false }),
    {},
  );
  assert.deepEqual(
    pruneFavoriteOverrides?.(["0002"], { "0002": true }),
    {},
  );
});

test("reconcileFavoriteOverride stores only differences from the persisted favorites", () => {
  assert.equal(typeof reconcileFavoriteOverride, "function");

  assert.deepEqual(
    reconcileFavoriteOverride?.({
      persistedFavoriteIds: ["0001"],
      overrides: {},
      id: "0001",
      nextIsFavorite: true,
    }),
    {},
  );

  assert.deepEqual(
    reconcileFavoriteOverride?.({
      persistedFavoriteIds: ["0001"],
      overrides: {},
      id: "0001",
      nextIsFavorite: false,
    }),
    { "0001": false },
  );
});

test("syncFavoriteCollections updates data and filtered views from the same effective favorites", () => {
  assert.equal(typeof syncFavoriteCollections, "function");

  const result = syncFavoriteCollections?.({
    data: [
      { id: "0001", isFavorite: false },
      { id: "0002", isFavorite: false },
    ],
    filteredData: [{ id: "0001", isFavorite: false }],
    favoriteIds: ["0001"],
  });

  assert.deepEqual(result?.nextData.map(({ id, isFavorite }) => ({ id, isFavorite })), [
    { id: "0001", isFavorite: true },
    { id: "0002", isFavorite: false },
  ]);
  assert.deepEqual(
    result?.nextFilteredData.map(({ id, isFavorite }) => ({ id, isFavorite })),
    [{ id: "0001", isFavorite: true }],
  );
});

test("getNextFavoritePersistRetryDelayMs backs off and caps retries", () => {
  assert.equal(typeof getNextFavoritePersistRetryDelayMs, "function");

  assert.equal(getNextFavoritePersistRetryDelayMs?.(null), 1000);
  assert.equal(getNextFavoritePersistRetryDelayMs?.(1000), 2000);
  assert.equal(getNextFavoritePersistRetryDelayMs?.(16000), 30000);
  assert.equal(getNextFavoritePersistRetryDelayMs?.(30000), 30000);
});
