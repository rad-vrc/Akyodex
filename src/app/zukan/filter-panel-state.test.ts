import assert from "node:assert/strict";
import test from "node:test";

import {
  getNextFilterPanelOpenState,
  resolveFilterPanelOpenState,
} from "./filter-panel-state";

test("resolveFilterPanelOpenState keeps the filter panel closed until mobile state is known", () => {
  assert.equal(resolveFilterPanelOpenState({ isFilterPanelOpen: null, isMobile: undefined }), false);
  assert.equal(resolveFilterPanelOpenState({ isFilterPanelOpen: null, isMobile: true }), false);
  assert.equal(resolveFilterPanelOpenState({ isFilterPanelOpen: null, isMobile: false }), true);
});

test("resolveFilterPanelOpenState respects an explicit user toggle", () => {
  assert.equal(resolveFilterPanelOpenState({ isFilterPanelOpen: true, isMobile: true }), true);
  assert.equal(resolveFilterPanelOpenState({ isFilterPanelOpen: false, isMobile: false }), false);
});

test("getNextFilterPanelOpenState toggles from the resolved default state", () => {
  assert.equal(getNextFilterPanelOpenState({ current: null, isMobile: undefined }), true);
  assert.equal(getNextFilterPanelOpenState({ current: null, isMobile: true }), true);
  assert.equal(getNextFilterPanelOpenState({ current: null, isMobile: false }), false);
  assert.equal(getNextFilterPanelOpenState({ current: true, isMobile: true }), false);
});
