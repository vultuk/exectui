import type { ScrollBoxRenderable } from "@opentui/core";
import { useEffect, useRef } from "react";
import type { IssueSummary, PullRequestSummary } from "../types";
import { toIssueSelectDescription } from "../lib/format";

const ISSUE_CARD_WIDTH_HINT = 52;
const ISSUE_CARD_STRIDE = 5;

type IssueListPaneProps = {
  issues: IssueSummary[];
  linkedPullRequestsByIssueNumber: Record<number, PullRequestSummary>;
  selectedIssueNumber: number | null;
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
  focused,
  loading,
  error,
  onActivatePane,
  onSelectIssue,
}: IssueListPaneProps) {
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
      width={72}
      minWidth={56}
      maxWidth={76}
      border
      borderStyle="rounded"
      borderColor="#315a72"
      focusedBorderColor="#f5b85c"
      title="Codex Issues"
      titleAlignment="center"
      backgroundColor="#0b141b"
      padding={1}
      focusable
      focused={focused}
    >
      <box flexDirection="column" gap={1} height="100%">
        <text fg="#f5b85c">
          <strong>{issues.length}</strong> open issues
        </text>
        {error ? (
          <box border borderStyle="single" borderColor="#b84a3c" padding={1}>
            <text fg="#ffb3a8">{error}</text>
          </box>
        ) : issues.length === 0 ? (
          <box border borderStyle="single" borderColor="#315a72" padding={1}>
            <text fg="#9bb4c4">
              {loading
                ? "Loading issues from GitHub..."
                : "No open issues found in the configured repository."}
            </text>
          </box>
        ) : (
          <scrollbox
            ref={scrollRef}
            flexGrow={1}
            backgroundColor="#0b141b"
            scrollY
            rootOptions={{ backgroundColor: "#0b141b" }}
            viewportOptions={{ backgroundColor: "#0b141b" }}
            contentOptions={{ backgroundColor: "#0b141b" }}
            scrollbarOptions={{
              trackOptions: { backgroundColor: "#173042", foregroundColor: "#5fb3b3" },
            }}
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
                    borderColor={selected ? "#f5b85c" : "#315a72"}
                    backgroundColor={selected ? "#173042" : "#10212b"}
                    height={4}
                    focusable
                    onMouseDown={() => {
                      onActivatePane();
                      onSelectIssue(issue.number);
                    }}
                  >
                    <box flexDirection="column" gap={0} paddingX={1}>
                      <text fg={selected ? "#f5b85c" : "#f9f6ef"}>
                        <strong>
                          {selected ? "▶ " : ""}
                          {truncateForCard(issue.title, ISSUE_CARD_WIDTH_HINT)}
                        </strong>
                      </text>
                      <text fg={selected ? "#d9e5ec" : "#6f91a4"}>
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
