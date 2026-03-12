import type { ScrollBoxRenderable } from "@opentui/core";
import { useKeyboard } from "@opentui/react";
import type { ReactNode } from "react";
import { useRef } from "react";
import {
  formatPullRequestMeta,
  formatReviewHeading,
  formatTimestamp,
  normalizeCheckState,
  summarizeChecks,
} from "../lib/format";
import { useTheme } from "../lib/theme";
import { MarkdownDocument } from "./MarkdownDocument";
import type { PullRequestDetail, PullRequestSummary } from "../types";

type PullRequestPaneProps = {
  pullRequestSummary: PullRequestSummary | null;
  pullRequest: PullRequestDetail | null;
  loading: boolean;
  error: string | null;
  focused: boolean;
};

export function PullRequestPane({
  pullRequestSummary,
  pullRequest,
  loading,
  error,
  focused,
}: PullRequestPaneProps) {
  const theme = useTheme();
  const scrollRef = useRef<ScrollBoxRenderable | null>(null);
  const effectiveChecks = pullRequest?.checks ?? [];

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
      minWidth={44}
      border
      borderStyle="rounded"
      borderColor={theme.colors.border}
      focusedBorderColor={theme.colors.focusBorder}
      backgroundColor={theme.colors.panelBackgroundAlt}
      padding={1}
      focusable
      focused={focused}
    >
      <box flexDirection="column" gap={1} height="100%">
        <PaneHeader
          text={
            pullRequestSummary
              ? `Pull Request #${pullRequestSummary.number}`
              : "Pull Request"
          }
        />
        <box flexGrow={1} minHeight={10}>
          {error ? (
            <ErrorMessage message={error} />
          ) : loading && !pullRequest ? (
            <EmptyMessage message="Loading pull request thread..." />
          ) : !pullRequestSummary ? (
            <EmptyMessage message="No open pull request linked to the selected issue." />
          ) : !pullRequest ? (
            <EmptyMessage message="Waiting for pull request data..." />
          ) : (
            <box flexDirection="column" gap={1} height="100%">
              <PullRequestSummaryCard pullRequest={pullRequest} />
              <scrollbox
                ref={scrollRef}
                flexGrow={1}
                focused={focused}
                scrollY
                backgroundColor={theme.colors.panelBackgroundAlt}
                rootOptions={{ backgroundColor: theme.colors.panelBackgroundAlt }}
                viewportOptions={{ backgroundColor: theme.colors.panelBackgroundAlt }}
                contentOptions={{ backgroundColor: theme.colors.panelBackgroundAlt }}
                scrollbarOptions={{
                  trackOptions: {
                    backgroundColor: theme.colors.scrollbarTrack,
                    foregroundColor: theme.colors.scrollbarThumb,
                  },
                }}
                verticalScrollbarOptions={{ visible: true }}
              >
                <box flexDirection="column" gap={1} paddingRight={1}>
                  <SectionLabel text="Description" />
                  <MarkdownDocument content={pullRequest.body} />

                  <SectionLabel text={`Conversation (${pullRequest.comments.length})`} />
                  {pullRequest.comments.length === 0 ? (
                    <EmptyMessage message="No conversation comments on this pull request." />
                  ) : (
                    pullRequest.comments.map((comment, index) => (
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

                  <SectionLabel text={`Reviews (${pullRequest.reviews.length})`} />
                  {pullRequest.reviews.length === 0 ? (
                    <EmptyMessage message="No reviews have been submitted yet." />
                  ) : (
                    pullRequest.reviews.map((review, reviewIndex) => (
                      <box
                        key={`${review.url}-${reviewIndex}`}
                        flexDirection="column"
                        border
                        borderStyle="single"
                        borderColor={theme.colors.borderMuted}
                        padding={1}
                        gap={1}
                      >
                        <text fg={theme.colors.textHighlight}>
                          <strong>{formatReviewHeading(review)}</strong>
                        </text>
                        {review.body.trim() ? (
                          <MarkdownDocument content={review.body} />
                        ) : (
                          <text fg={theme.colors.textSecondary}>
                            No summary body on this review.
                          </text>
                        )}
                        {review.comments.map((comment, commentIndex) => (
                          <box
                            key={`${comment.url}-${commentIndex}`}
                            flexDirection="column"
                            border
                            borderStyle="single"
                            borderColor={theme.colors.borderStrong}
                            padding={1}
                          >
                            <text fg={theme.colors.textAccent}>
                              {comment.authorLogin}
                              <span fg={theme.colors.textMuted}>
                                {comment.path ? ` · ${comment.path}` : ""} ·{" "}
                                {formatTimestamp(comment.createdAt)}
                              </span>
                            </text>
                            <MarkdownDocument content={comment.body} />
                          </box>
                        ))}
                      </box>
                    ))
                  )}
                </box>
              </scrollbox>
            </box>
          )}
        </box>

        <box
          height={10}
          minHeight={10}
          border
          borderStyle="single"
          borderColor={theme.colors.border}
          padding={1}
          backgroundColor={theme.colors.chromeBackground}
          flexDirection="column"
          gap={1}
        >
          <text fg={theme.colors.textAccent}>
            <strong>CI Status</strong>
            <span fg={theme.colors.textMuted}> · {summarizeChecks(effectiveChecks)}</span>
          </text>
          {effectiveChecks.length === 0 ? (
            <text fg={theme.colors.textSecondary}>
              {pullRequestSummary
                ? "No checks have been published for this pull request yet."
                : "Select an issue with an open pull request to see CI progress."}
            </text>
          ) : (
            <scrollbox
              flexGrow={1}
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
              <box flexDirection="column" gap={0}>
                {effectiveChecks.map((check, index) => {
                  const state = normalizeCheckState(check);
                  const color =
                    state === "passing"
                      ? theme.colors.textSuccess
                      : state === "running"
                        ? theme.colors.textWarning
                        : theme.colors.textFailure;
                  const marker =
                    state === "passing" ? "PASS" : state === "running" ? "RUN " : "FAIL";

                  return (
                    <text key={`${check.name}-${index}`} fg={theme.colors.textSecondary}>
                      <span fg={color}>
                        <strong>{marker}</strong>
                      </span>
                      <span fg={theme.colors.textSecondary}> {check.name}</span>
                      <span fg={theme.colors.textMuted}>
                        {check.description ? ` · ${check.description}` : ""}
                      </span>
                    </text>
                  );
                })}
              </box>
            </scrollbox>
          )}
        </box>
      </box>
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

function PullRequestSummaryCard({ pullRequest }: { pullRequest: PullRequestDetail }) {
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
        <strong>{pullRequest.title}</strong>
      </HeaderLine>
      <HeaderLine fg={theme.colors.textMuted}>
        {formatPullRequestMeta(pullRequest)}
      </HeaderLine>
      <HeaderLine fg={theme.colors.textAccent}>{pullRequest.url}</HeaderLine>
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
