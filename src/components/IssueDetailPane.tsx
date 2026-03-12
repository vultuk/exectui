import type { ScrollBoxRenderable } from "@opentui/core";
import { useKeyboard } from "@opentui/react";
import type { ReactNode } from "react";
import { useRef } from "react";
import { formatTimestamp } from "../lib/format";
import { useTheme } from "../lib/theme";
import { MarkdownDocument } from "./MarkdownDocument";
import type { IssueDetail } from "../types";

type IssueDetailPaneProps = {
  issue: IssueDetail | null;
  loading: boolean;
  error: string | null;
  focused: boolean;
};

export function IssueDetailPane({
  issue,
  loading,
  error,
  focused,
}: IssueDetailPaneProps) {
  const theme = useTheme();
  const scrollRef = useRef<ScrollBoxRenderable | null>(null);

  useKeyboard((key) => {
    if (!focused) {
      return;
    }

    if (key.name === "down" || key.name === "j") {
      scrollRef.current?.scrollBy(3, "step");
      return;
    }

    if (key.name === "up" || key.name === "k") {
      scrollRef.current?.scrollBy(-3, "step");
      return;
    }

    if (key.name === "pagedown") {
      scrollRef.current?.scrollBy(1, "viewport");
      return;
    }

    if (key.name === "pageup") {
      scrollRef.current?.scrollBy(-1, "viewport");
    }
  });

  return (
    <box
      flexGrow={1}
      flexBasis={0}
      minWidth={42}
      border
      borderStyle="rounded"
      borderColor={theme.colors.border}
      focusedBorderColor={theme.colors.focusBorder}
      backgroundColor={theme.colors.panelBackground}
      padding={1}
      focusable
      focused={focused}
    >
      {error ? (
        <ErrorMessage message={error} />
      ) : loading && !issue ? (
        <EmptyMessage message="Loading issue thread..." />
      ) : !issue ? (
        <EmptyMessage message="Select an issue to inspect the thread." />
      ) : (
        <box flexDirection="column" gap={1} height="100%">
          <PaneHeader text={issue ? `Issue #${issue.number}` : "Issue Detail"} />
          <IssueSummaryCard issue={issue} />
          <scrollbox
            ref={scrollRef}
            flexGrow={1}
            focused={focused}
            scrollY
            backgroundColor={theme.colors.panelBackground}
            rootOptions={{ backgroundColor: theme.colors.panelBackground }}
            viewportOptions={{ backgroundColor: theme.colors.panelBackground }}
            contentOptions={{ backgroundColor: theme.colors.panelBackground }}
            scrollbarOptions={{
              trackOptions: {
                backgroundColor: theme.colors.scrollbarTrack,
                foregroundColor: theme.colors.scrollbarThumb,
              },
            }}
            verticalScrollbarOptions={{ visible: true }}
          >
            <box flexDirection="column" gap={1} paddingRight={1}>
              <SectionLabel text="Original Issue" />
              <MarkdownDocument content={issue.body} />

              <SectionLabel text={`Responses (${issue.comments.length})`} />
              {issue.comments.length === 0 ? (
                <EmptyMessage message="No follow-up comments yet." />
              ) : (
                issue.comments.map((comment, index) => (
                  <box
                    key={`${comment.url}-${index}`}
                    flexDirection="column"
                    border
                    borderStyle="single"
                    borderColor={theme.colors.borderMuted}
                    padding={1}
                  >
                    <text fg={theme.colors.textHighlight}>
                      <strong>{comment.authorLogin}</strong>
                      <span fg={theme.colors.textMuted}>
                        {" "}
                        · {formatTimestamp(comment.createdAt)}
                      </span>
                    </text>
                    <MarkdownDocument content={comment.body} />
                  </box>
                ))
              )}
            </box>
          </scrollbox>
        </box>
      )}
    </box>
  );
}

function PaneHeader({ text }: { text: string }) {
  const theme = useTheme();

  return (
    <box
      height={1}
      minHeight={1}
      maxHeight={1}
      justifyContent="center"
      overflow="hidden"
    >
      <text fg={theme.colors.border} width="100%" wrapMode="none" truncate>
        {text}
      </text>
    </box>
  );
}

function IssueSummaryCard({ issue }: { issue: IssueDetail }) {
  const theme = useTheme();

  return (
    <box
      flexDirection="column"
      border
      borderStyle="single"
      borderColor={theme.colors.borderMuted}
      height={7}
      minHeight={7}
      maxHeight={7}
      overflow="hidden"
      padding={1}
    >
      <HeaderLine fg={theme.colors.textPrimary}>
        <strong>{issue.title}</strong>
      </HeaderLine>
      <HeaderLine fg={theme.colors.textMuted}>
        #{issue.number} · {issue.authorLogin} · {issue.state} · updated{" "}
        {formatTimestamp(issue.updatedAt)}
      </HeaderLine>
      <HeaderLine fg={theme.colors.textAccent}>{issue.url}</HeaderLine>
    </box>
  );
}

function HeaderLine({
  fg,
  children,
}: {
  fg: string;
  children: ReactNode;
}) {
  return (
    <box height={1} minHeight={1} maxHeight={1} overflow="hidden">
      <text fg={fg} width="100%" wrapMode="none" truncate>
        {children}
      </text>
    </box>
  );
}

function SectionLabel({ text }: { text: string }) {
  const theme = useTheme();
  return (
    <text fg={theme.colors.textAccent}>
      <strong>{text}</strong>
    </text>
  );
}

function EmptyMessage({ message }: { message: string }) {
  const theme = useTheme();
  return (
    <box border borderStyle="single" borderColor={theme.colors.border} padding={1}>
      <text fg={theme.colors.textSecondary}>{message}</text>
    </box>
  );
}

function ErrorMessage({ message }: { message: string }) {
  const theme = useTheme();
  return (
    <box border borderStyle="single" borderColor={theme.colors.borderDanger} padding={1}>
      <text fg={theme.colors.textDanger}>{message}</text>
    </box>
  );
}
