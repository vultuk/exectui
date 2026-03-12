import { SyntaxStyle } from "@opentui/core";
import { marked, type Token, type Tokens } from "marked";
import type { ReactNode } from "react";
import { useTheme, type AppTheme } from "../lib/theme";

const codeStyle = SyntaxStyle.create();

type MarkdownDocumentProps = {
  content: string;
};

export function MarkdownDocument({ content }: MarkdownDocumentProps) {
  const theme = useTheme();
  const source = content.trim() || "_No content provided._";
  const tokens = marked.lexer(source, {
    gfm: true,
    breaks: true,
  });

  return (
    <box flexDirection="column" gap={1}>
      {tokens.map((token, index) => (
        <MarkdownBlock
          token={token}
          key={`block-${index}-${token.type}`}
          depth={0}
          theme={theme}
        />
      ))}
    </box>
  );
}

function MarkdownBlock({
  token,
  depth,
  theme,
}: {
  token: Token;
  depth: number;
  theme: AppTheme;
}) {
  switch (token.type) {
    case "heading":
      return <MarkdownHeading token={token as Tokens.Heading} theme={theme} />;
    case "paragraph":
      return (
        <MarkdownParagraph
          tokens={(token as Tokens.Paragraph).tokens ?? []}
          theme={theme}
        />
      );
    case "text":
      return (
        <MarkdownParagraph tokens={(token as Tokens.Text).tokens ?? [token]} theme={theme} />
      );
    case "code":
      return <MarkdownCodeBlock token={token as Tokens.Code} theme={theme} />;
    case "blockquote":
      const blockquote = token as Tokens.Blockquote;
      return (
        <box
          border
          borderStyle="single"
          borderColor={theme.colors.quoteBorder}
          backgroundColor={theme.colors.quoteBackground}
          padding={1}
        >
          <box flexDirection="column" gap={1}>
            {(blockquote.tokens ?? []).map((child, index) => (
              <MarkdownBlock
                token={child}
                key={`blockquote-${depth}-${index}-${child.type}`}
                depth={depth + 1}
                theme={theme}
              />
            ))}
          </box>
        </box>
      );
    case "list":
      return <MarkdownList token={token as Tokens.List} depth={depth} theme={theme} />;
    case "hr":
      return (
        <text fg={theme.colors.border}>
          <span>────────────────────────────────────────</span>
        </text>
      );
    case "table":
      return <MarkdownTableFallback token={token as Tokens.Table} theme={theme} />;
    case "html":
      return renderHtmlToken(token as Tokens.HTML, theme);
    default:
      return null;
  }
}

function MarkdownHeading({ token, theme }: { token: Tokens.Heading; theme: AppTheme }) {
  const color =
    token.depth === 1
      ? theme.colors.textHighlight
      : token.depth === 2
        ? theme.colors.textAccent
        : token.depth === 3
          ? theme.colors.textAccentSoft
          : theme.colors.textSecondary;

  return (
    <box
      border
      borderStyle="single"
      borderColor={theme.colors.borderMuted}
      backgroundColor={theme.colors.panelBackgroundMuted}
      padding={1}
    >
      <text fg={color}>
        <strong>{renderInlineTokens(token.tokens ?? [], theme)}</strong>
      </text>
    </box>
  );
}

function MarkdownParagraph({ tokens, theme }: { tokens: Token[]; theme: AppTheme }) {
  return <text fg={theme.colors.textSecondary}>{renderInlineTokens(tokens, theme)}</text>;
}

function MarkdownCodeBlock({ token, theme }: { token: Tokens.Code; theme: AppTheme }) {
  const language = normalizeLanguage(token.lang);

  return (
    <box
      border
      borderStyle="single"
      borderColor={theme.colors.border}
      backgroundColor={theme.colors.panelBackground}
      padding={1}
      flexDirection="column"
      gap={1}
    >
      <text fg={theme.colors.textAccent}>
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
  theme,
}: {
  token: Tokens.List;
  depth: number;
  theme: AppTheme;
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
            <text fg={theme.colors.textAccent}>
              <strong>{marker}</strong>
            </text>
            <box flexDirection="column" flexGrow={1} gap={1}>
              {renderListItemContent(item, depth + 1, theme)}
            </box>
          </box>
        );
      })}
    </box>
  );
}

function MarkdownTableFallback({ token, theme }: { token: Tokens.Table; theme: AppTheme }) {
  const header = token.header.map((cell) => cell.text).join(" | ");
  const rows = token.rows.map((row) => row.map((cell) => cell.text).join(" | "));
  const content = [header, ...rows].join("\n");

  return (
    <box border borderStyle="single" borderColor={theme.colors.border} padding={1}>
      <code
        content={content}
        filetype="text"
        syntaxStyle={codeStyle}
      />
    </box>
  );
}

function renderListItemContent(item: Tokens.ListItem, depth: number, theme: AppTheme) {
  if (!item.tokens.length) {
    return <text fg={theme.colors.textSecondary}>{item.text}</text>;
  }

  return item.tokens.map((token, index) => (
    <MarkdownBlock
      token={token}
      key={`list-item-${depth}-${index}-${token.type}`}
      depth={depth}
      theme={theme}
    />
  ));
}

function renderInlineTokens(tokens: Token[], theme: AppTheme): ReactNode[] {
  return tokens.flatMap((token, index) =>
    renderInlineToken(token, `${token.type}-${index}`, theme),
  );
}

function renderInlineToken(token: Token, key: string, theme: AppTheme): ReactNode[] {
  switch (token.type) {
    case "text":
    case "escape":
      return [token.text];
    case "strong":
      return [<strong key={key}>{renderInlineTokens(token.tokens ?? [], theme)}</strong>];
    case "em":
      return [<em key={key}>{renderInlineTokens(token.tokens ?? [], theme)}</em>];
    case "del":
      return [
        <span key={key} fg={theme.colors.textMuted}>
          {renderInlineTokens(token.tokens ?? [], theme)}
        </span>,
      ];
    case "codespan":
      return [
        <span
          key={key}
          fg={theme.colors.inlineCodeForeground}
          bg={theme.colors.inlineCodeBackground}
        >
          {token.text}
        </span>,
      ];
    case "link":
      return [
        <span key={key} fg={theme.colors.textAccent}>
          <u>{renderInlineTokens(token.tokens ?? [], theme)}</u>
        </span>,
      ];
    case "br":
      return [<br />];
    default:
      if ("tokens" in token && Array.isArray(token.tokens)) {
        return [<span key={key}>{renderInlineTokens(token.tokens, theme)}</span>];
      }

      return [];
  }
}

function normalizeLanguage(value: string | undefined) {
  return value?.trim().toLowerCase().split(/\s+/)[0];
}

function renderHtmlToken(token: Tokens.HTML, theme: AppTheme) {
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
        borderColor={theme.colors.quoteBorder}
        backgroundColor={theme.colors.quoteBackground}
        padding={1}
      >
        <text fg={theme.colors.textAccent}>
          <strong>{summaryText}</strong>
        </text>
      </box>
    );
  }

  if (/^<img\b/i.test(raw)) {
    const altText = raw.match(/\balt="([^"]*)"/i)?.[1]?.trim();
    return (
      <box border borderStyle="single" borderColor={theme.colors.border} padding={1}>
        <text fg={theme.colors.textMuted}>
          {altText ? `Image: ${altText}` : "Image omitted"}
        </text>
      </box>
    );
  }

  const stripped = stripHtml(raw).trim();
  if (!stripped) {
    return null;
  }

  return (
    <box border borderStyle="single" borderColor={theme.colors.border} padding={1}>
      <text fg={theme.colors.textSecondary}>{stripped}</text>
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
