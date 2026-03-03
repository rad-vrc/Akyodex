#!/usr/bin/env node

const { spawnSync } = require("node:child_process");

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd || process.cwd(),
    encoding: "utf8",
    stdio: options.stdio || "pipe",
    shell: false,
  });

  if (result.error) {
    throw result.error;
  }

  return result;
}

function fail(message, code = 1) {
  console.error(message);
  process.exit(code);
}

function getCurrentBranch() {
  const result = run("git", ["rev-parse", "--abbrev-ref", "HEAD"]);
  if (result.status !== 0) {
    fail(result.stderr.trim() || "Failed to determine current branch.");
  }
  return result.stdout.trim();
}

function checkGhAvailable() {
  const result = run("gh", ["--version"]);
  if (result.status !== 0) {
    fail("`gh` CLI is required to verify PR merge conflicts after push.", 3);
  }
}

function pushBranch(pushArgs) {
  const args = ["push", ...pushArgs];
  const result = spawnSync("git", args, {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: "inherit",
    shell: false,
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

function loadOpenPullRequests(branch) {
  const result = run("gh", [
    "pr",
    "list",
    "--head",
    branch,
    "--state",
    "open",
    "--json",
    "number,url,title,mergeable,mergeStateStatus,baseRefName,headRefName",
  ]);

  if (result.status !== 0) {
    fail(result.stderr.trim() || "Failed to query pull request status.", 3);
  }

  return JSON.parse(result.stdout);
}

function isConflict(pr) {
  return pr.mergeable === "CONFLICTING" || pr.mergeStateStatus === "DIRTY";
}

function formatPr(pr) {
  return `#${pr.number} ${pr.headRefName} -> ${pr.baseRefName} | mergeable=${pr.mergeable} | state=${pr.mergeStateStatus} | ${pr.url}`;
}

function main() {
  const pushArgs = process.argv.slice(2);

  checkGhAvailable();
  pushBranch(pushArgs);

  const branch = getCurrentBranch();
  const prs = loadOpenPullRequests(branch);

  if (prs.length === 0) {
    console.log(`Push completed. No open PR found for branch '${branch}'.`);
    return;
  }

  const conflicting = prs.filter(isConflict);

  console.log("Push completed. PR status:");
  for (const pr of prs) {
    console.log(`- ${formatPr(pr)}`);
  }

  if (conflicting.length > 0) {
    console.error("");
    console.error("Merge conflicts detected in the open PR above.");
    process.exit(2);
  }
}

main();
