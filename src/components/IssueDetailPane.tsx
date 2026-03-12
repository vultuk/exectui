import type { ScrollBoxRenderable } from "@opentui/core";
import { useKeyboard } from "@opentui/react";
import { useRef } from "react";
import { formatTimestamp } from "../lib/format";
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
      borderColor="#315a72"
      focusedBorderColor="#f5b85c"
      title={issue ? `Issue #${issue.number}` : "Issue Detail"}
      titleAlignment="center"
      backgroundColor="#0d1821"
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
          <scrollbox
            ref={scrollRef}
            flexGrow={1}
            focused={focused}
            scrollY
            backgroundColor="#0d1821"
            rootOptions={{ backgroundColor: "#0d1821" }}
            viewportOptions={{ backgroundColor: "#0d1821" }}
            contentOptions={{ backgroundColor: "#0d1821" }}
            scrollbarOptions={{
              trackOptions: { backgroundColor: "#173042", foregroundColor: "#5fb3b3" },
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
                  <strong>{issue.title}</strong>
                </text>
              <text fg="#6f91a4">
                #{issue.number} · {issue.authorLogin} · {issue.state} · updated{" "}
                {formatTimestamp(issue.updatedAt)}
              </text>
              <text fg="#8ed7c6">{issue.url}</text>
            </box>

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
          </box>
        </scrollbox>
      )}
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
