# dsh-bundles

Small [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)
profile bundles, developed against the `dsh-tui` profile. One directory per
bundle; each bundle is self-contained and installed into the profile by path.

## Bundles

- `dsh-command-review/` — `/review` slash command: delegates document review
  to a `spawn` subagent, optionally on another model
  (`/review [--model provider/model | model] [--effort <effort>] [--output <file>] <doc-path> [-- extra instructions]`).
  See its `README.md` for usage. Installed as `@local/dsh-command-review`.

## Install / update a bundle

Prerequisites: a working DeepSeek Harness install with the `dsh-tui` profile.

```sh
git clone git@github.com:jwitmann/dsh-bundles.git   # e.g. to ~/dsh-bundles
```

In a `dsh-tui` session, via the plugin manager:

```text
install_bundle <clone-path>/<bundle-dir>   # first install
remove_bundle @local/<bundle-name>         # then install again on updates
```

Concrete example:

```text
install_bundle ~/dsh-bundles/dsh-command-review
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

JS style is Biome 2.x (`biome.json`).
Markdown style is markdownlint-cli2 (`.markdownlint-cli2.jsonc`).
Framework-owned trees (`.dsh`, `.opencode`, `.dev-framework*`) are
intentionally excluded from linting — never reformat those.

## Layout

- `dsh-command-review/` — the `/review` bundle (code + `locale/` metadata)
- `scripts/` — committed verification scripts (e.g. `smoke-review.mjs`)
- `biome.json`, `.markdownlint-cli2.jsonc`, `package.json`, `pnpm-lock.yaml` — shared JS/Markdown tooling

Local-only and not committed: `.operator/` (project brain), plus the
framework-owned `.dsh/`, `.opencode/`, and `.dev-framework*` trees.
