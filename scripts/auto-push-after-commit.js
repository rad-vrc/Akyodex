#!/usr/bin/env node

const { existsSync } = require("node:fs");
const { join } = require("node:path");
const { spawnSync } = require("node:child_process");

function classifyAutoPushAfterCommit({
  env = process.env,
  gitState = loadGitState(),
} = {}) {
  if (env.AKYODEX_SKIP_AUTO_PUSH === "1") {
    return { shouldPush: false, reason: "disabled-by-env" };
  }

  if (gitState.rebaseMergeExists || gitState.rebaseApplyExists) {
    return { shouldPush: false, reason: "rebase-in-progress" };
  }

  return { shouldPush: true, reason: null };
}

function loadGitState() {
  const gitDir = resolveGitDir();
  return {
    rebaseMergeExists: existsSync(join(gitDir, "rebase-merge")),
    rebaseApplyExists: existsSync(join(gitDir, "rebase-apply")),
  };
}

function resolveGitDir() {
  const result = spawnSync("git", ["rev-parse", "--git-dir"], {
    cwd: process.cwd(),
    encoding: "utf8",
    shell: false,
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(result.stderr.trim() || "Failed to resolve .git directory.");
  }

  return join(process.cwd(), result.stdout.trim());
}

function run() {
  const decision = classifyAutoPushAfterCommit();

  if (!decision.shouldPush) {
    console.log(`[auto-push] Skipping push after commit (${decision.reason}).`);
    return;
  }

  const result = spawnSync(process.execPath, [join(__dirname, "push-and-check-pr-conflicts.js")], {
    cwd: process.cwd(),
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

if (require.main === module) {
  run();
}

module.exports = {
  classifyAutoPushAfterCommit,
};
