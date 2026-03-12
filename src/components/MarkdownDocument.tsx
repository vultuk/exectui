import { SyntaxStyle } from "@opentui/core";
import { marked, type Token, type Tokens } from "marked";
import type { ReactNode } from "react";

const codeStyle = SyntaxStyle.create();

type MarkdownDocumentProps = {
  content: string;
};

export function MarkdownDocument({ content }: MarkdownDocumentProps) {
  const source = content.trim() || "_No content provided._";
  const tokens = marked.lexer(source, {
    gfm: true,
    breaks: true,
  });

  return (
    <box flexDirection="column" gap={1}>
      {tokens.map((token, index) => (
        <MarkdownBlock token={token} key={`block-${index}-${token.type}`} depth={0} />
      ))}
    </box>
  );
}

function MarkdownBlock({
  token,
  depth,
}: {
  token: Token;
  depth: number;
}) {
  switch (token.type) {
    case "heading":
      return <MarkdownHeading token={token as Tokens.Heading} />;
    case "paragraph":
      return <MarkdownParagraph tokens={(token as Tokens.Paragraph).tokens ?? []} />;
    case "text":
      return <MarkdownParagraph tokens={(token as Tokens.Text).tokens ?? [token]} />;
    case "code":
      return <MarkdownCodeBlock token={token as Tokens.Code} />;
    case "blockquote":
      const blockquote = token as Tokens.Blockquote;
      return (
        <box
          border
          borderStyle="single"
          borderColor="#3d697d"
          backgroundColor="#112028"
          padding={1}
        >
          <box flexDirection="column" gap={1}>
            {(blockquote.tokens ?? []).map((child, index) => (
              <MarkdownBlock
                token={child}
                key={`blockquote-${depth}-${index}-${child.type}`}
                depth={depth + 1}
              />
            ))}
          </box>
        </box>
      );
    case "list":
      return <MarkdownList token={token as Tokens.List} depth={depth} />;
    case "hr":
      return (
        <text fg="#315a72">
          <span>────────────────────────────────────────</span>
        </text>
      );
    case "table":
      return <MarkdownTableFallback token={token as Tokens.Table} />;
    case "html":
      return renderHtmlToken(token as Tokens.HTML);
    default:
      return null;
  }
}

function MarkdownHeading({ token }: { token: Tokens.Heading }) {
  const color =
    token.depth === 1
      ? "#f5b85c"
      : token.depth === 2
        ? "#8ed7c6"
        : token.depth === 3
          ? "#d6f0ea"
          : "#d9e5ec";

  return (
    <box
      border
      borderStyle="single"
      borderColor="#284556"
      backgroundColor="#10212b"
      padding={1}
    >
      <text fg={color}>
        <strong>{renderInlineTokens(token.tokens ?? [])}</strong>
      </text>
    </box>
  );
}

function MarkdownParagraph({ tokens }: { tokens: Token[] }) {
  return <text fg="#d9e5ec">{renderInlineTokens(tokens)}</text>;
}

function MarkdownCodeBlock({ token }: { token: Tokens.Code }) {
  const language = normalizeLanguage(token.lang);

  return (
    <box
      border
      borderStyle="single"
      borderColor="#315a72"
      backgroundColor="#0d1821"
      padding={1}
      flexDirection="column"
      gap={1}
    >
      <text fg="#8ed7c6">
        <strong>{language || "text"}</strong>
      </text>
      <code
        content={token.text}
        filetype={language || "text"}
        syntaxStyle={codeStyle}
      />
    </box>
  );
}

function MarkdownList({
  token,
  depth,
}: {
  token: Tokens.List;
  depth: number;
}) {
  return (
    <box flexDirection="column" gap={1}>
      {token.items.map((item, index) => {
        const marker = token.ordered
          ? `${Number(token.start || 1) + index}.`
          : item.task
            ? item.checked
              ? "[x]"
              : "[ ]"
            : "•";

        return (
          <box key={`list-${depth}-${index}`} flexDirection="row" gap={1}>
            <text fg="#8ed7c6">
              <strong>{marker}</strong>
            </text>
            <box flexDirection="column" flexGrow={1} gap={1}>
              {renderListItemContent(item, depth + 1)}
            </box>
          </box>
        );
      })}
    </box>
  );
}

function MarkdownTableFallback({ token }: { token: Tokens.Table }) {
  const header = token.header.map((cell) => cell.text).join(" | ");
  const rows = token.rows.map((row) => row.map((cell) => cell.text).join(" | "));
  const content = [header, ...rows].join("\n");

  return (
    <box border borderStyle="single" borderColor="#315a72" padding={1}>
      <code
        content={content}
        filetype="text"
        syntaxStyle={codeStyle}
      />
    </box>
  );
}

function renderListItemContent(item: Tokens.ListItem, depth: number) {
  if (!item.tokens.length) {
    return <text fg="#d9e5ec">{item.text}</text>;
  }

  return item.tokens.map((token, index) => (
    <MarkdownBlock
      token={token}
      key={`list-item-${depth}-${index}-${token.type}`}
      depth={depth}
    />
  ));
}

function renderInlineTokens(tokens: Token[]): ReactNode[] {
  return tokens.flatMap((token, index) => renderInlineToken(token, `${token.type}-${index}`));
}

function renderInlineToken(token: Token, key: string): ReactNode[] {
  switch (token.type) {
    case "text":
    case "escape":
      return [token.text];
    case "strong":
      return [<strong key={key}>{renderInlineTokens(token.tokens ?? [])}</strong>];
    case "em":
      return [<em key={key}>{renderInlineTokens(token.tokens ?? [])}</em>];
    case "del":
      return [
        <span key={key} fg="#6f91a4">
          {renderInlineTokens(token.tokens ?? [])}
        </span>,
      ];
    case "codespan":
      return [
        <span key={key} fg="#f5b85c" bg="#13232d">
          {token.text}
        </span>,
      ];
    case "link":
      return [
        <span key={key} fg="#8ed7c6">
          <u>{renderInlineTokens(token.tokens ?? [])}</u>
        </span>,
      ];
    case "br":
      return [<br />];
    default:
      if ("tokens" in token && Array.isArray(token.tokens)) {
        return [<span key={key}>{renderInlineTokens(token.tokens)}</span>];
      }

      return [];
  }
}

function normalizeLanguage(value: string | undefined) {
  return value?.trim().toLowerCase().split(/\s+/)[0];
}

function renderHtmlToken(token: Tokens.HTML) {
  const raw = token.text.trim();
  if (!raw) {
    return null;
  }

  if (/^<\/?details\b/i.test(raw)) {
    return null;
  }

  const summaryMatch = raw.match(/<summary[^>]*>([\s\S]*?)<\/summary>/i);
  if (summaryMatch) {
    const summaryText = stripHtml(summaryMatch[1] ?? "").trim();
    if (!summaryText) {
      return null;
    }

    return (
      <box
        border
        borderStyle="single"
        borderColor="#3d697d"
        backgroundColor="#112028"
        padding={1}
      >
        <text fg="#8ed7c6">
          <strong>{summaryText}</strong>
        </text>
      </box>
    );
  }

  if (/^<img\b/i.test(raw)) {
    const altText = raw.match(/\balt="([^"]*)"/i)?.[1]?.trim();
    return (
      <box border borderStyle="single" borderColor="#315a72" padding={1}>
        <text fg="#6f91a4">{altText ? `Image: ${altText}` : "Image omitted"}</text>
      </box>
    );
  }

  const stripped = stripHtml(raw).trim();
  if (!stripped) {
    return null;
  }

  return (
    <box border borderStyle="single" borderColor="#315a72" padding={1}>
      <text fg="#9bb4c4">{stripped}</text>
    </box>
  );
}

function stripHtml(value: string) {
  return value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}
