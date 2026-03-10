const assert = require("node:assert/strict");
const test = require("node:test");

const { classifyAutoPushAfterCommit } = require("./auto-push-after-commit");

test("classifyAutoPushAfterCommit enables auto-push for normal commits", () => {
  const result = classifyAutoPushAfterCommit({
    env: {},
    gitState: {
      rebaseMergeExists: false,
      rebaseApplyExists: false,
    },
  });

  assert.equal(result.shouldPush, true);
  assert.equal(result.reason, null);
});

test("classifyAutoPushAfterCommit can be explicitly disabled", () => {
  const result = classifyAutoPushAfterCommit({
    env: {
      AKYODEX_SKIP_AUTO_PUSH: "1",
    },
    gitState: {
      rebaseMergeExists: false,
      rebaseApplyExists: false,
    },
  });

  assert.equal(result.shouldPush, false);
  assert.equal(result.reason, "disabled-by-env");
});

test("classifyAutoPushAfterCommit skips auto-push during rebase", () => {
  const result = classifyAutoPushAfterCommit({
    env: {},
    gitState: {
      rebaseMergeExists: true,
      rebaseApplyExists: false,
    },
  });

  assert.equal(result.shouldPush, false);
  assert.equal(result.reason, "rebase-in-progress");
});
