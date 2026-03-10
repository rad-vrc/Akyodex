import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { IconGrid } from "./icons";

test("IconGrid renders a two-card stack silhouette", () => {
  const markup = renderToStaticMarkup(React.createElement(IconGrid));
  const rectCount = (markup.match(/<rect/g) || []).length;

  assert.equal(rectCount, 2);
  assert.match(markup, /viewBox="48 40 344 320"/);
  assert.match(markup, /stroke-width="24"/);
  assert.match(markup, /transform="rotate\(-13 176 184\)"/);
});
