# Independent Codex review — procedure

Lightweight procedure for the redesign missions: the main Claude Code session implements, Codex CLI
reviews independently in an isolated Git worktree, Herdr coordinates. Codex never writes to the
implementer's working tree. Nothing here changes `~/.codex/config.toml`: every setting is a
per-launch flag.

## 1. Snapshot the changes (orchestrator)

```bash
# Run from the repo root; the pre-existing fr.md change is never part of a review
S=~/.local/share/contes-creole-qa/<mission>/review
mkdir -p "$S"
BASE=$(git rev-parse HEAD)
git diff --binary HEAD -- . ':!src/books/ti-kannot/langue/fr.md' > "$S/changes.patch"
git ls-files -o --exclude-standard > "$S/untracked.txt"   # review and copy these by hand
git diff --stat HEAD -- . ':!src/books/ti-kannot/langue/fr.md' > "$S/stat.txt"
sha256sum "$S/changes.patch" > "$S/changes.patch.sha256"
```

## 2. Isolated worktree (orchestrator)

```bash
WT=~/.local/share/contes-creole-qa/<mission>/review-wt
git worktree add --detach "$WT" "$BASE"
git -C "$WT" apply --index "$S/changes.patch"
# copy each file listed in untracked.txt into "$WT" at the same path, then `git -C "$WT" add` it
pnpm --dir "$WT" install --frozen-lockfile --offline
git -C "$WT" diff --cached --stat   # must match stat.txt
```

The orchestrator installs dependencies, outside the Codex sandbox, so Codex never needs the pnpm store
lock (`ERR_PNPM_STORE_DIR_OPEN_OPERATION_LOCK` in M3).

## 3. Start Codex (Herdr)

```bash
herdr pane split --current --direction right --cwd "$PWD" --no-focus   # read .result.pane.pane_id
herdr agent start <mission>-review --kind codex --pane <pane-id> -- \
  -C "$WT" \
  --sandbox workspace-write \
  --ask-for-approval on-request \
  -c sandbox_workspace_write.network_access=false \
  -c check_for_update_on_startup=false
```

Sandbox effect (Codex docs, `/openai/codex` via context7, 2026-10-29):

- `workspace-write` makes the working root (`-C`) writable, plus `/tmp` and `TMPDIR`; the rest of
  the filesystem is read-only.
- `.git` and the resolved `gitdir:` target stay read-only, so Codex can read `git diff` but cannot
  commit, stage or apply in the worktree.
- `network_access` defaults to `false`, but the global config sets it to `true`, so the per-launch
  override is needed.
- `check_for_update_on_startup = false` suppresses the startup update prompt.

Confirmed on the installed 0.164.0 with `codex --help`: `-C/--cd`, `-s/--sandbox`,
`-a/--ask-for-approval`, `-c/--config`, `--add-dir`, `--worktree`.
Not yet confirmed at runtime: whether the two `-c` overrides take effect in the TUI, and whether the
gates run inside the sandbox. Check both at the first launch; if a flag is rejected, drop it and
report it, without falling back to wider permissions.

`/tmp` remains writable inside the sandbox. Keep the snapshot, worktree and evidence under
`~/.local/share/contes-creole-qa/`, not in `/tmp`. A new worktree path can show the "Trust this
folder?" dialog: that is an owner decision (see §6).

Not used: `codex --worktree` creates a managed worktree from HEAD, without the uncommitted changes
under review.

## 4. Gates run by Codex

Call the local binaries, not `pnpm <script>`, so pnpm does not touch its store:

```bash
node_modules/.bin/prettier --check .
node_modules/.bin/eslint . --max-warnings=0
node_modules/.bin/tsc --noEmit
node_modules/.bin/vitest run
node_modules/.bin/tsc -b && node_modules/.bin/vite build
```

All writes (`dist/`, `*.tsbuildinfo`, the vitest cache) land inside the worktree. Browser and GPU QA
stay with the implementing session; Codex audits that evidence (JSON, captures) instead of rerunning
Chromium.

Reviewer output block: `VERDICT` (PASS | PASS_WITH_RESERVATIONS | CHANGES_REQUESTED | BLOCKED),
`FINDINGS`, `AC CHECK`, `COMMANDS RUN`, `RESERVATIONS`. The brief also quotes the rulings in force
from `docs/redesign/decisions.md`.

## 5. After the review (orchestrator)

```bash
sha256sum -c "$S/changes.patch.sha256"   # the snapshot was not altered
git -C "$WT" status --short              # only build outputs; any tracked change is a finding
git status --short                       # implementer tree unchanged (fr.md still the only extra)
```

- Do not take Codex being `idle` or `done` as PASS: parse the verdict block and cross-check at least
  one AC against an evidence file.
- If corrections are needed, they are made in the main tree, then steps 1 to 5 run again (at most 2
  cycles).
- Cleanup needs the owner's approval, because it deletes the worktree: `git worktree remove "$WT"`,
  then `git worktree prune`. Close the review pane with `herdr pane close <pane-id>`. Close only panes
  this mission created.

## 6. Herdr states

- Start: target only a pane created by this mission, with a shell prompt visible
  (`herdr pane read <id> --source visible`). Before the first prompt, `herdr agent get` must show
  `idle` and no `launch_pending`.
- `blocked`: read `herdr agent explain <name> --format text` and `herdr agent read <name> --source
detection` (`recent-unwrapped` is refused while blocked; `visible` can be stale). Permission, trust,
  sandbox escalation or question: ask the owner, never answer it automatically. After the answer,
  re-check with `agent get`.
- Timeout: not a failure, never a reason to resend. Check `agent get` and `agent read --source
recent-unwrapped`. For runs longer than 10 minutes, run `herdr agent wait` as a background task.
- `unknown`: send no input; `agent explain` plus a detection read; if it persists after one more
  `agent wait --timeout 60000`, report to the owner.
- End of mission: report file present and newer than the prompt, verdict parsed, Git state as
  expected, no QA server left listening, panes created by the mission closed.
