# Repo Notes

- Push after changes with `npm run push:check-pr -- [git push args]` instead of raw `git push` when possible.
- That script runs `git push` first, then checks the open PR for the current branch with `gh pr list`.
- Exit code `2` means GitHub reports merge conflicts (`mergeable=CONFLICTING` or `mergeStateStatus=DIRTY`).
- Exit code `4` means GitHub has not finished calculating mergeability after the retry window, so conflict status is still unverified.
