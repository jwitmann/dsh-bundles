# dsh-config

Workspace for simple [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)
profile bundles, developed against the `dsh-tui` profile. One directory per
bundle; each bundle is self-contained and installed into the profile by path.

## Bundles

- `dsh-command-review/` — `/review` slash command: delegates document review
  to a `spawn` subagent, optionally on another model
  (`/review [--model provider/model] [--output file] <doc-path>`).
  See its `README.md` for usage. Installed as `@local/dsh-command-review`.

## Install / update a bundle

In a `dsh-tui` session, via the plugin manager:

```text
install_bundle /home/jerome/dsh-config/<bundle-dir>   # first install
remove_bundle @local/<bundle-name>                     # then install again on updates
```

After editing a bundle's JS, bump its `package.json` version, reinstall,
and open a fresh `dsh-tui` session before testing (module generations cache).

## Verify

```sh
pnpm install        # Biome toolchain (first time only)
pnpm typecheck      # node --check on the bundle
pnpm test           # handler smoke suite
pnpm exec biome check .   # lint + format, workspace-wide
pnpm lint:md        # markdownlint via npx on our Markdown files
```

JS style is Biome 2.x (`biome.json`, mirrored from `~/operator-memory`).
Markdown style is markdownlint-cli2 (`.markdownlint-cli2.jsonc`, mirrored
from `~/opencode-dev-framework`, plus ignores for the scaffolded mirrors).
Framework-owned trees (`.dsh`, `.opencode`, `.dev-framework*`) are
intentionally excluded from linting — never reformat those.

## Layout

- `dsh-command-review/` — the `/review` bundle (code + `locale/` metadata)
- `scripts/` — committed verification scripts (e.g. `smoke-review.mjs`)
- `.operator/` — Operator Memory project brain (private index + catalog)
- `.dev-framework/` — opencode-dev-framework config, hardening notes, reviews
- `biome.json`, `.markdownlint-cli2.jsonc`, `package.json`, `pnpm-lock.yaml` — shared JS/Markdown tooling
