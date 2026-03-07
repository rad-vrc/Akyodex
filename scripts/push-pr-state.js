function classifyBranchPrState({ openPrs, mergedPrs }) {
  if (openPrs.length > 0) {
    return { state: "open", prs: openPrs };
  }

  if (mergedPrs.length > 0) {
    return { state: "merged", prs: mergedPrs };
  }

  return { state: "none", prs: [] };
}

module.exports = {
  classifyBranchPrState,
};
