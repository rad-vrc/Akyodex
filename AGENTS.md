# Repo Notes

- This repo can auto-check PR merge conflicts after a normal `git push` when `core.hooksPath` is set to `.githooks`.
- Run `npm run hooks:enable` once per clone (or set `git config core.hooksPath .githooks`) to enable the shared hooks.
- `npm run push:check-pr -- [git push args]` is still available as a manual wrapper.
- That script runs `git push` first, then checks the open PR for the current branch with `gh pr list`. With `--skip-push`, it only performs the PR check.
- Exit code `2` means GitHub reports merge conflicts (`mergeable=CONFLICTING` or `mergeStateStatus=DIRTY`).
- Exit code `4` means GitHub has not finished calculating mergeability after the retry window, so conflict status is still unverified.
