import assert from "node:assert/strict";
import test from "node:test";

import { getDifyContainerAriaHidden } from "./dify-chatbot-a11y";

test("Dify error fallback remains exposed to assistive technologies", () => {
  assert.equal(getDifyContainerAriaHidden("error"), null);
  assert.equal(getDifyContainerAriaHidden("idle"), "true");
  assert.equal(getDifyContainerAriaHidden("loaded"), null);
});
