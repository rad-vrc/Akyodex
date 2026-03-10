import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import test from "node:test";

import { LoadingAnnouncement } from "./loading-announcement";

test("zukan loading state announces progress through a live region", () => {
  const markup = renderToStaticMarkup(LoadingAnnouncement({ text: "Loading data..." }));

  assert.match(markup, /role="status"/);
  assert.match(markup, /aria-live="polite"/);
  assert.match(markup, /Loading data/);
});
