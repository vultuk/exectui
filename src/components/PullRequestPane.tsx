import type { ScrollBoxRenderable } from "@opentui/core";
import { useKeyboard } from "@opentui/react";
import { useRef } from "react";
import {
  formatPullRequestMeta,
  formatReviewHeading,
  formatTimestamp,
  normalizeCheckState,
  summarizeChecks,
} from "../lib/format";
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
      minWidth={44}
      border
      borderStyle="rounded"
      borderColor="#315a72"
      focusedBorderColor="#f5b85c"
      title={
        pullRequestSummary
          ? `Pull Request #${pullRequestSummary.number}`
          : "Pull Request"
      }
      titleAlignment="center"
      backgroundColor="#101b1f"
      padding={1}
      focusable
      focused={focused}
    >
      <box flexDirection="column" gap={1} height="100%">
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
            <scrollbox
              ref={scrollRef}
              flexGrow={1}
              focused={focused}
              scrollY
              backgroundColor="#101b1f"
              rootOptions={{ backgroundColor: "#101b1f" }}
              viewportOptions={{ backgroundColor: "#101b1f" }}
              contentOptions={{ backgroundColor: "#101b1f" }}
              scrollbarOptions={{
                trackOptions: { backgroundColor: "#183138", foregroundColor: "#8ed7c6" },
              }}
            >
              <box flexDirection="column" gap={1} paddingRight={1}>
                <box
                  flexDirection="column"
                  border
                  borderStyle="single"
                  borderColor="#284556"
                  padding={1}
                >
                  <text fg="#f9f6ef">
                    <strong>{pullRequest.title}</strong>
                  </text>
                  <text fg="#6f91a4">{formatPullRequestMeta(pullRequest)}</text>
                  <text fg="#8ed7c6">{pullRequest.url}</text>
                </box>

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
                      borderColor="#284556"
                      padding={1}
                    >
                      <text fg="#f5b85c">
                        <strong>{comment.authorLogin}</strong>
                        <span fg="#6f91a4"> · {formatTimestamp(comment.createdAt)}</span>
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
                      borderColor="#284556"
                      padding={1}
                      gap={1}
                    >
                      <text fg="#f5b85c">
                        <strong>{formatReviewHeading(review)}</strong>
                      </text>
                      {review.body.trim() ? (
                        <MarkdownDocument content={review.body} />
                      ) : (
                        <text fg="#9bb4c4">No summary body on this review.</text>
                      )}
                      {review.comments.map((comment, commentIndex) => (
                        <box
                          key={`${comment.url}-${commentIndex}`}
                          flexDirection="column"
                          border
                          borderStyle="single"
                          borderColor="#3d697d"
                          padding={1}
                        >
                          <text fg="#8ed7c6">
                            {comment.authorLogin}
                            <span fg="#6f91a4">
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
          )}
        </box>

        <box
          height={10}
          minHeight={10}
          border
          borderStyle="single"
          borderColor="#315a72"
          padding={1}
          backgroundColor="#0c1316"
          flexDirection="column"
          gap={1}
        >
          <text fg="#8ed7c6">
            <strong>CI Status</strong>
            <span fg="#6f91a4"> · {summarizeChecks(effectiveChecks)}</span>
          </text>
          {effectiveChecks.length === 0 ? (
            <text fg="#9bb4c4">
              {pullRequestSummary
                ? "No checks have been published for this pull request yet."
                : "Select an issue with an open pull request to see CI progress."}
            </text>
          ) : (
            <scrollbox
              flexGrow={1}
              scrollY
              rootOptions={{ backgroundColor: "#0c1316" }}
              viewportOptions={{ backgroundColor: "#0c1316" }}
              contentOptions={{ backgroundColor: "#0c1316" }}
              scrollbarOptions={{
                trackOptions: { backgroundColor: "#183138", foregroundColor: "#8ed7c6" },
              }}
            >
              <box flexDirection="column" gap={0}>
                {effectiveChecks.map((check, index) => {
                  const state = normalizeCheckState(check);
                  const color =
                    state === "passing"
                      ? "#8ed7c6"
                      : state === "running"
                        ? "#f5b85c"
                        : "#ff8f70";
                  const marker =
                    state === "passing" ? "PASS" : state === "running" ? "RUN " : "FAIL";

                  return (
                    <text key={`${check.name}-${index}`} fg="#d9e5ec">
                      <span fg={color}>
                        <strong>{marker}</strong>
                      </span>
                      <span fg="#d9e5ec"> {check.name}</span>
                      <span fg="#6f91a4">
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

function SectionLabel({ text }: { text: string }) {
  return (
    <text fg="#8ed7c6">
      <strong>{text}</strong>
    </text>
  );
}

function EmptyMessage({ message }: { message: string }) {
  return (
    <box border borderStyle="single" borderColor="#315a72" padding={1}>
      <text fg="#9bb4c4">{message}</text>
    </box>
  );
}

function ErrorMessage({ message }: { message: string }) {
  return (
    <box border borderStyle="single" borderColor="#b84a3c" padding={1}>
      <text fg="#ffb3a8">{message}</text>
    </box>
  );
}
