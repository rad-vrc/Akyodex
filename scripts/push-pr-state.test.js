const assert = require("node:assert/strict");
const test = require("node:test");

const { classifyBranchPrState } = require("./push-pr-state");

test("classifyBranchPrState blocks branches that only have merged PRs", () => {
  const result = classifyBranchPrState({
    openPrs: [],
    mergedPrs: [{ number: 334, url: "https://example.com/pr/334" }],
  });

  assert.equal(result.state, "merged");
  assert.equal(result.prs.length, 1);
  assert.equal(result.prs[0].number, 334);
});

test("classifyBranchPrState allows continuing when an open PR exists", () => {
  const result = classifyBranchPrState({
    openPrs: [{ number: 335, url: "https://example.com/pr/335" }],
    mergedPrs: [{ number: 334, url: "https://example.com/pr/334" }],
  });

  assert.equal(result.state, "open");
  assert.equal(result.prs.length, 1);
  assert.equal(result.prs[0].number, 335);
});

test("classifyBranchPrState returns none when the branch has no PRs yet", () => {
  const result = classifyBranchPrState({
    openPrs: [],
    mergedPrs: [],
  });

  assert.equal(result.state, "none");
  assert.deepEqual(result.prs, []);
});
