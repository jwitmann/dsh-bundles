# AGENTS.md — dsh-config

Context file for AI agents working on the `dsh-config` project.

## Project purpose

`dsh-config` is a workspace for simple [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)
profile bundles, developed against the `dsh-tui` profile. One directory per
bundle; each bundle is self-contained (code + `cordis.patch.yml` + `locale/`
metadata) and installed into the profile by path.

Current bundles:

- `dsh-command-review/` — `/review` slash command: delegates document review
  to a `spawn` subagent, optionally on another model
  (`/review [--model provider/model] [--output file] <doc-path]`).
  Omitting `--model` inherits the parent session route.

There is no build step and no test runner in this workspace. Verification is
`node --check` + a committed Node smoke script + Biome.

## Tech stack

- **Language:** JavaScript (ESM, `"type": "module"`), JSDoc for types
- **Runtime target:** DSH Cordis plugins (`export const inject`, `export function apply`)
- **Development runtime:** Node.js + pnpm
- **Package manager:** pnpm for development (Biome toolchain only)
- **Formatter & Linter:** Biome 2.x (dev dependency, `biome.json` mirrored from `~/operator-memory`)
- **Tests:** committed Node scripts in `scripts/` (no runner; exit non-zero on failure)

## Linting and formatting

We enforce style with Biome. The interface is:

```bash
pnpm install                # Biome toolchain (first time only)
pnpm exec biome check .     # lint + format + organize imports, workspace-wide
pnpm exec biome check --write <file>  # auto-fix one file
pnpm lint:md                # markdownlint via npx (config: .markdownlint-cli2.jsonc; workspace-local .npm-cache)
```

Before finishing any change:

1. Run `pnpm exec biome check .`. If it fails, fix (hand-edit or `--write`) and re-run.
2. Run `pnpm lint:md` when you touched any Markdown. Fix findings by hand
   (never `--fix` blindly — the config already excludes the scaffolded
   `.dsh/`/`.opencode/` mirrors; everything else it lints is ours).
3. Do not suppress lint warnings without a comment explaining why.
4. Never reformat framework-owned trees — they are intentionally excluded in
   `biome.json` (`!.dsh`, `!.opencode`, `!.dev-framework`, `!.dev-framework.yml`).
   If you add a new file, make sure it is covered by the `files.includes` glob.

## Build / test / validate

There is no build. Run these before finishing any change:

```bash
pnpm install        # first time only
pnpm typecheck      # node --check on the bundle entry point(s)
pnpm test           # handler smoke suite (scripts/smoke-review.mjs)
pnpm exec biome check .   # lint + format, workspace-wide
pnpm lint:md        # markdownlint (npx) on our Markdown files
```

`pnpm test` runs without network or harness: the smoke script stubs
`ctx.commands` / `ctx.subagents` and asserts handler results plus the
subagent spec (route inheritance means _no_ `agentOptions` key when no
model flags are given).

## Bundle install / update (DSH)

Bundles are installed by absolute path via the plugin manager in a `dsh-tui`
session — there is no registry and no CLI install path:

```text
install_bundle /home/jerome/dsh-config/<bundle-dir>   # first install
remove_bundle @local/<bundle-name>                     # then install again on updates
```

After editing a bundle's JS:

1. Bump its `package.json` version.
2. `remove_bundle` + `install_bundle` again.
3. Open a **fresh** `dsh-tui` session before testing (module generations cache).
4. Smoke-test the command there (e.g. `/review <doc>`).

Model IDs must be exact adapter catalog IDs (e.g. `opencode-go/kimi-k3.1-pro`,
not a short name) — the adapter validates the route at child start.

## Conventions

- Keep each bundle self-contained: `index.js` + `cordis.patch.yml` +
  `locale/*.json` + `README.md`. Shared JS tooling lives only at the workspace
  root (`package.json`, `biome.json`, `scripts/`).
- One slash command per bundle file; register on `ctx.commands`, declare needs
  via `export const inject` (e.g. `["commands", "subagents"]`).
- Subagent delegation uses `ctx.subagents.startActivation` with
  `delivery: "parent"` so the child works independently and reports back.
- Flag parsing pattern: `tokenize` (shell-like quoting) + `takeFlag`
  (`--flag value` / `--flag=value`; a present-but-valueless flag is consumed
  and yields `""` so the handler reports a usage error). A `-`-leading
  positional is rejected unless after a `--` separator.
- Keep handlers pure-ish and stub-testable: no harness imports in flag/parse
  code, so `scripts/*.mjs` can import `apply` with a fake `ctx`.
- When adding behavior, extend the smoke script cases (including the negative
  control) rather than asserting it works by eye.

## Important rules

### Do

- Run `pnpm typecheck` and `pnpm test` after any bundle code change.
- Run `pnpm exec biome check .` before finishing, and keep it clean.
- Update `scripts/smoke-*.mjs` when adding or changing handler behavior.
- Update the bundle `README.md` and the workspace `README.md` when usage changes.
- Keep this `AGENTS.md` accurate as the workspace evolves.

### Don't

- Don't add a test runner, bundler, or runtime dependencies for simple
  command bundles — plain ESM plus a smoke script is the stack.
- Don't re-add `--preset` (deliberately omitted — omission inherits the parent
  preset) or other flags the user has rejected, unasked.
- Don't touch `.dsh/`, `.opencode/`, or `.dev-framework*` by hand — they are
  framework-owned (managed by `df-init` / `df-update`).
- Don't commit local-only trees — `.gitignore` (mirrored from
  `opencode-dev-framework`) already excludes `node_modules/`,
  `.pnpm-store/`, `dist/`, plus the live brain/scaffolding state
  (`.operator/`, `.dsh/`, `.opencode/`, `.dev-framework*`).
- **Never push to remote.** Commit changes locally only. Pushing or publishing
  is a deliberate user action, not an agent action.

## Project layout

```text
dsh-config/
├── dsh-command-review/       # /review slash-command bundle
│   ├── index.js              # registration, flag parsing, subagent activation
│   ├── package.json          # bundle manifest (@local/…, dsh.bundle.patch)
│   ├── cordis.patch.yml      # loader patch inserting the plugin row
│   ├── locale/en.json        # bundle display metadata
│   └── README.md             # bundle usage and examples
├── scripts/
│   └── smoke-review.mjs      # committed handler smoke suite (the "test" command)
├── .operator/                # Operator Memory project brain (private index + catalog)
├── .dev-framework/           # opencode-dev-framework state, hardening notes, reviews
├── biome.json                # Biome 2.x config (mirrored from ~/operator-memory)
├── package.json              # workspace scripts (typecheck / test / biome)
├── pnpm-lock.yaml
└── README.md                 # workspace overview
```

## Committing

- This directory is not yet a git repository. When it becomes one, commit
  locally when a logical unit is complete and all validation passes.
- **Never push to remote.** The user controls when and if anything is published.
- Use clear, concise commit messages. Prefer present tense and describe what
  the change does.

Example:

```bash
git add dsh-command-review/index.js scripts/smoke-review.mjs
git commit -m "fix: reject valueless --output instead of spawning a review"
```

## Operator / framework notes

- Brain policy is keep-everything-private: no `.operator-shared/` partition;
  do not publish project content outside `.operator/`.
- The opencode-dev-framework gate runs profile `standard` with
  `pnpm typecheck` / `pnpm test` / changed-file Biome lint and
  `require_review` — sessions that change files must leave a substantive
  `.dev-framework/review.md` artifact (written after the latest edit).
