import type { ScrollBoxRenderable } from "@opentui/core";
import { useEffect, useRef } from "react";
import type { IssueSummary, PullRequestSummary } from "../types";
import { toIssueSelectDescription } from "../lib/format";
import { useTheme } from "../lib/theme";

const ISSUE_CARD_WIDTH_HINT = 52;
const ISSUE_CARD_STRIDE = 5;

type IssueListPaneProps = {
  issues: IssueSummary[];
  linkedPullRequestsByIssueNumber: Record<number, PullRequestSummary>;
  selectedIssueNumber: number | null;
  width?: number | `${number}%`;
  minWidth?: number;
  maxWidth?: number;
  titleMaxLength?: number;
  focused: boolean;
  loading: boolean;
  error: string | null;
  onActivatePane: () => void;
  onSelectIssue: (issueNumber: number) => void;
};

export function IssueListPane({
  issues,
  linkedPullRequestsByIssueNumber,
  selectedIssueNumber,
  width = 72,
  minWidth = 56,
  maxWidth = 76,
  titleMaxLength = ISSUE_CARD_WIDTH_HINT,
  focused,
  loading,
  error,
  onActivatePane,
  onSelectIssue,
}: IssueListPaneProps) {
  const theme = useTheme();
  const scrollRef = useRef<ScrollBoxRenderable | null>(null);
  const selectedIndex = issues.findIndex((issue) => issue.number === selectedIssueNumber);

  useEffect(() => {
    if (!scrollRef.current || selectedIndex < 0) {
      return;
    }

    const viewportHeight = Math.max(scrollRef.current.height, ISSUE_CARD_STRIDE);
    const viewTop = scrollRef.current.scrollTop;
    const viewBottom = viewTop + viewportHeight - 1;
    const itemTop = selectedIndex * ISSUE_CARD_STRIDE;
    const itemBottom = itemTop + ISSUE_CARD_STRIDE - 1;

    if (itemTop < viewTop) {
      scrollRef.current.scrollTo(itemTop);
      return;
    }

    if (itemBottom > viewBottom) {
      scrollRef.current.scrollTo(itemBottom - viewportHeight + 1);
    }
  }, [selectedIndex]);

  return (
    <box
      width={width}
      minWidth={minWidth}
      maxWidth={maxWidth}
      border
      borderStyle="rounded"
      borderColor={theme.colors.border}
      focusedBorderColor={theme.colors.focusBorder}
      title="Codex Issues"
      titleAlignment="center"
      backgroundColor={theme.colors.chromeBackground}
      padding={1}
      focusable
      focused={focused}
    >
      <box flexDirection="column" gap={1} height="100%">
        <text fg={theme.colors.textHighlight}>
          <strong>{issues.length}</strong> open issues
        </text>
        {error ? (
          <box border borderStyle="single" borderColor={theme.colors.borderDanger} padding={1}>
            <text fg={theme.colors.textDanger}>{error}</text>
          </box>
        ) : issues.length === 0 ? (
          <box border borderStyle="single" borderColor={theme.colors.border} padding={1}>
            <text fg={theme.colors.textSecondary}>
              {loading
                ? "Loading issues from GitHub..."
                : "No open issues found in the configured repository."}
            </text>
          </box>
        ) : (
          <scrollbox
            ref={scrollRef}
            flexGrow={1}
            backgroundColor={theme.colors.chromeBackground}
            scrollY
            rootOptions={{ backgroundColor: theme.colors.chromeBackground }}
            viewportOptions={{ backgroundColor: theme.colors.chromeBackground }}
            contentOptions={{ backgroundColor: theme.colors.chromeBackground }}
            scrollbarOptions={{
              trackOptions: {
                backgroundColor: theme.colors.scrollbarTrack,
                foregroundColor: theme.colors.scrollbarThumb,
              },
            }}
            verticalScrollbarOptions={{ visible: true }}
          >
            <box flexDirection="column" gap={1}>
              {issues.map((issue) => {
                const selected = issue.number === selectedIssueNumber;
                const linkedPullRequest =
                  linkedPullRequestsByIssueNumber[issue.number] ?? null;

                return (
                  <box
                    key={issue.number}
                    border
                    borderStyle="single"
                    borderColor={selected ? theme.colors.focusBorder : theme.colors.border}
                    backgroundColor={
                      selected
                        ? theme.colors.panelBackgroundSelected
                        : theme.colors.panelBackgroundMuted
                    }
                    height={4}
                    focusable
                    onMouseDown={() => {
                      onActivatePane();
                      onSelectIssue(issue.number);
                    }}
                  >
                    <box flexDirection="column" gap={0} paddingX={1}>
                      <text
                        fg={selected ? theme.colors.textHighlight : theme.colors.textPrimary}
                      >
                        <strong>
                          {selected ? "▶ " : ""}
                          {truncateForCard(issue.title, titleMaxLength)}
                        </strong>
                      </text>
                      <text
                        fg={selected ? theme.colors.textSecondary : theme.colors.textMuted}
                      >
                        {toIssueSelectDescription(issue, linkedPullRequest)}
                      </text>
                    </box>
                  </box>
                );
              })}
            </box>
          </scrollbox>
        )}
      </box>
    </box>
  );
}

function truncateForCard(value: string, maxLength: number) {
  const trimmed = value.trim();
  if (trimmed.length <= maxLength) {
    return trimmed;
  }

  return `${trimmed.slice(0, Math.max(0, maxLength - 1))}…`;
}
