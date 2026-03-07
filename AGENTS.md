# Repo Notes

- In this environment, PowerShell wraps `git push` for this repo and runs the PR conflict check automatically after a successful push.
- `npm run push:check-pr -- [git push args]` remains the portable fallback wrapper.
- That script blocks pushes when the current branch only has merged PRs, and otherwise runs `git push` first and then checks the open PR for the current branch with `gh pr list`. With `--skip-push`, it only performs the PR check. With `--fail-if-merged`, it only performs the merged-PR guard.
- The script invokes `git` via Node `spawnSync(..., { shell: false })`, so it executes `git.exe` directly and does not re-enter shell-level wrappers.
- Exit code `2` means GitHub reports merge conflicts (`mergeable=CONFLICTING` or `mergeStateStatus=DIRTY`).
- Exit code `4` means GitHub has not finished calculating mergeability after the retry window, so conflict status is still unverified.
- Exit code `5` means the current branch already has a merged PR and should be continued on a new branch / PR instead.
