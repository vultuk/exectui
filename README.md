# ExecTUI

OpenTUI app for monitoring a Codex-driven GitHub workflow from the terminal.

## Current Scope

This first version includes:

- Pane 1: all open issues in the configured repository
- Pane 2: issue body plus follow-up comments, rendered as Markdown
- Pane 3: linked open pull request description, conversation, reviews, and a fixed CI status area
- Keyboard navigation between panes with `Tab`, `Shift+Tab`, `1`, `2`, `3`, `r`, and `Esc`

## Configuration

Set the repository before launching:

```bash
cp .env.example .env
```

Required:

- `GITHUB_REPOSITORY=owner/repo`

Optional:

- `GITHUB_REFRESH_INTERVAL_SECONDS=30`

The app uses the authenticated GitHub CLI session on your machine for API access.

## Run

```bash
bun install
bun run start
```

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
- This is an initial shell. Issue creation, `execplan`, PR feedback actions, merge controls, and richer filtering are not implemented yet.
