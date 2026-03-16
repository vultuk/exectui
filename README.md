# ExecTUI

OpenTUI app for monitoring a Codex-driven GitHub workflow from the terminal.

## Current Scope

This first version includes:

- Pane 1: all open issues in the configured repository
- Pane 2: issue body plus follow-up comments, rendered as Markdown
- Pane 3: linked open pull request description, conversation, reviews, and a fixed CI status area
- Keyboard navigation between panes with `Tab`, `Shift+Tab`, `1`, `2`, `3`, `r`, and `Esc`

## Configuration

Repository selection:

```bash
bun run start -- owner/repo
```

If you omit the argument, ExecTUI will try to use the current working directory's
git `origin` remote instead.

Optional:

- `GITHUB_REFRESH_INTERVAL_SECONDS=30`

The app uses the authenticated GitHub CLI session on your machine for API access.

## Run

```bash
bun install
bun run start
```

Run it through `npx`:

```bash
npx exectui
npx exectui -- owner/repo
```

`npx` is just the package launcher here. Bun still needs to be installed locally because
ExecTUI runs on the Bun/OpenTUI runtime.

Development watch mode:

```bash
bun run dev
```

Typecheck:

```bash
bun run typecheck
```

## Notes

- Pull requests are linked through GitHub `closingIssuesReferences`, so the PR needs to reference the issue using normal GitHub closing syntax.
- Theme selection is persisted between launches in your local config directory at `$XDG_CONFIG_HOME/exectui/settings.json` or `~/.config/exectui/settings.json`.
- This is an initial shell. Issue creation, `execplan`, PR feedback actions, merge controls, and richer filtering are not implemented yet.
