import React from "react";
import toast from "react-hot-toast";

export function renderMarkdown(text: string): React.ReactNode {
  if (!text) return null;

  // Split by code blocks first
  const parts: React.ReactNode[] = [];
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(text)) !== null) {
    // Add text before code block
    if (match.index > lastIndex) {
      parts.push(
        <React.Fragment key={`text-${match.index}`}>
          {renderInlineMarkdown(text.substring(lastIndex, match.index))}
        </React.Fragment>
      );
    }

    // Add code block (theme-aware: light and dark)
    const language = match[1] || "";
    const code = match[2];
    parts.push(
      <div
        key={`code-${match.index}`}
        className="p-2 py-3 px-3 rounded-lg relative overflow-x-auto bg-dark-100 dark:bg-dark-900 border border-dark-200 dark:border-dark-700"
      >
        <div className="flex justify-between items-center mb-1">
          {language && (
            <span className="text-dark-500 dark:text-dark-400 text-[0.85rem]">{language}</span>
          )}
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(code);
              toast.success("Code copied to clipboard!");
            }}
            className="py-1 px-3 text-[0.85rem] bg-primary-500 hover:bg-primary-600 text-white border-0 rounded cursor-pointer"
          >
            Copy
          </button>
        </div>
        <pre className="m-0 text-[0.9rem] whitespace-pre-wrap break-all font-mono text-dark-800 dark:text-lime-400">
          <code>{code}</code>
        </pre>
      </div>
    );

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(
      <React.Fragment key={`text-end-${lastIndex}`}>
        {renderInlineMarkdown(text.substring(lastIndex))}
      </React.Fragment>
    );
  }

  return <div className="markdown-content" style={{ margin: 0, padding: 0 }}>{parts}</div>;
}

function isBlockStart(line: string): boolean {
  const t = line.trim();
  if (t === "") return true;
  if (line.startsWith("### ")) return true;
  if (line.startsWith("## ")) return true;
  if (line.startsWith("# ")) return true;
  if (line.match(/^[-*_]{3,}\s*$/)) return true;
  if (line.startsWith("> ")) return true;
  if (line.match(/^[-*]\s/)) return true;
  if (line.match(/^\d+\.\s/)) return true;
  return false;
}

function isTableRow(line: string): boolean {
  return /^\|.+\|$/.test(line.trim()) && (line.match(/\|/g) || []).length >= 2;
}

function isTableSeparator(line: string): boolean {
  return /^\|[\s\-:|]+\|$/.test(line.trim());
}

function parseTableRow(line: string): string[] {
  const cells = line.split("|").map((c) => c.trim()).filter((_, i, arr) => i > 0 && i < arr.length - 1);
  return cells.length ? cells : line.split("|").map((c) => c.trim()).filter(Boolean);
}

function renderInlineMarkdown(text: string): React.ReactNode {
  if (!text) return null;

  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineIndex = i;

    if (line.trim() === "") {
      elements.push(<br key={`br-${lineIndex}`} />);
      continue;
    }

    // Headers
    if (line.startsWith("### ")) {
      elements.push(
        <h3 key={`h3-${lineIndex}`} style={{ fontSize: "1.1rem", margin: 0 }}>
          {parseInlineFormatting(line.substring(4))}
        </h3>
      );
      continue;
    }
    if (line.startsWith("## ")) {
      elements.push(
        <h2 key={`h2-${lineIndex}`} style={{ fontSize: "1.3rem", margin: 0 }}>
          {parseInlineFormatting(line.substring(3))}
        </h2>
      );
      continue;
    }
    if (line.startsWith("# ")) {
      elements.push(
        <h1 key={`h1-${lineIndex}`} style={{ fontSize: "1.5rem", margin: 0 }}>
          {parseInlineFormatting(line.substring(2))}
        </h1>
      );
      continue;
    }

    // Horizontal rule
    if (line.match(/^[-*_]{3,}\s*$/)) {
      elements.push(<hr key={`hr-${lineIndex}`} className="border-dark-200 dark:border-dark-700" style={{ margin: 0 }} />);
      continue;
    }

    // Blockquote
    if (line.startsWith("> ")) {
      elements.push(
        <blockquote
          key={`bq-${lineIndex}`}
          className="border-l-4 border-primary-500 pl-4 text-dark-600 dark:text-dark-400"
          style={{ margin: 0 }}
        >
          <p style={{ margin: 0 }}>{parseInlineFormatting(line.substring(2))}</p>
        </blockquote>
      );
      continue;
    }

    // Bullet list: collect consecutive - or * lines into one <ul>
    if (line.match(/^[-*]\s/)) {
      const listItems: React.ReactNode[] = [];
      listItems.push(
        <li key={0} style={{ margin: 0 }}>
          {parseInlineFormatting(line.substring(2))}
        </li>
      );
      while (i + 1 < lines.length && lines[i + 1].match(/^[-*]\s/)) {
        i++;
        listItems.push(
          <li key={listItems.length} style={{ margin: 0 }}>
            {parseInlineFormatting(lines[i].substring(2))}
          </li>
        );
      }
      elements.push(
        <ul key={`ul-${lineIndex}`} className="list-disc pl-6 my-0" style={{ margin: 0 }}>
          {listItems}
        </ul>
      );
      continue;
    }
    // Numbered list: collect consecutive 1. 2. lines into one <ol>
    if (line.match(/^\d+\.\s/)) {
      const listItems: React.ReactNode[] = [];
      listItems.push(
        <li key={0} style={{ margin: 0 }}>
          {parseInlineFormatting(line.replace(/^\d+\.\s/, ""))}
        </li>
      );
      while (i + 1 < lines.length && lines[i + 1].match(/^\d+\.\s/)) {
        i++;
        listItems.push(
          <li key={listItems.length} style={{ margin: 0 }}>
            {parseInlineFormatting(lines[i].replace(/^\d+\.\s/, ""))}
          </li>
        );
      }
      elements.push(
        <ol key={`ol-${lineIndex}`} className="list-decimal pl-6 my-0" style={{ margin: 0 }}>
          {listItems}
        </ol>
      );
      continue;
    }

    // Table: | Header | Value |, |---|, | cell | cell |
    if (isTableRow(line) && i + 1 < lines.length && isTableSeparator(lines[i + 1])) {
      const headerCells = parseTableRow(line);
      const dataRows: string[][] = [];
      let j = i + 2;
      while (j < lines.length && isTableRow(lines[j]) && !isTableSeparator(lines[j])) {
        dataRows.push(parseTableRow(lines[j]));
        j++;
      }
      const tableMarkdown = ["| " + headerCells.join(" | ") + " |", "| " + headerCells.map(() => "---").join(" | ") + " |", ...dataRows.map((row) => "| " + row.join(" | ") + " |")].join("\n");
      elements.push(
        <div key={`table-${lineIndex}`} className="overflow-x-auto rounded-lg border border-dark-200 dark:border-dark-700 relative group/table" style={{ margin: 0 }}>
          <table className="w-full border-collapse text-sm min-w-[var(--thread-content-width,200px)]">
            <thead>
              <tr className="border-b border-dark-200 dark:border-dark-700 bg-dark-100 dark:bg-dark-800">
                {headerCells.map((cell, ci) => (
                  <th
                    key={ci}
                    className="px-4 py-3 text-left font-semibold text-dark-900 dark:text-dark-50 border-r border-dark-200 dark:border-dark-700 last:border-r-0"
                  >
                    {parseInlineFormatting(cell)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dataRows.map((row, ri) => (
                <tr
                  key={ri}
                  className="border-b border-dark-100 dark:border-dark-800 bg-white dark:bg-dark-950 hover:bg-dark-50 dark:hover:bg-dark-900/50"
                >
                  {row.map((cell, ci) => (
                    <td
                      key={ci}
                      className="px-4 py-3 text-dark-700 dark:text-dark-300 border-r border-dark-100 dark:border-dark-800 last:border-r-0"
                    >
                      {parseInlineFormatting(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <div className="absolute end-0 top-0 flex items-center opacity-0 group-hover/table:opacity-100 transition-opacity p-1">
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(tableMarkdown);
                toast.success("Table copied!");
              }}
              className="text-dark-500 hover:text-dark-700 dark:hover:text-dark-300 hover:bg-dark-100 dark:hover:bg-dark-800 rounded p-1"
              aria-label="Copy table"
              title="Copy table"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16V4a2 2 0 0 1 2-2h12"/></svg>
            </button>
          </div>
        </div>
      );
      i = j - 1;
      continue;
    }

    // Multi-line paragraph: merge consecutive non-block lines so **bold** and *italic* work across lines
    const paragraphLines: string[] = [line];
    while (i + 1 < lines.length && !isBlockStart(lines[i + 1])) {
      i++;
      paragraphLines.push(lines[i]);
    }
    const paragraphText = paragraphLines.join("\n");
    elements.push(
      <p key={`p-${lineIndex}`} style={{ margin: 0, lineHeight: "1.6" }}>
        {parseInlineFormatting(paragraphText)}
      </p>
    );
  }

  return <div>{elements}</div>;
}

function parseInlineFormatting(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let currentIndex = 0;

  // Inline code
  const inlineCodeRegex = /`([^`]+)`/g;
  let match;

  while ((match = inlineCodeRegex.exec(text)) !== null) {
    // Add text before code
    if (match.index > currentIndex) {
      parts.push(
        <React.Fragment key={`pre-${match.index}`}>
          {parseBoldItalicStrikethrough(text.substring(currentIndex, match.index))}
        </React.Fragment>
      );
    }

    // Add code (theme-aware: light and dark)
    parts.push(
      <code
        key={`code-${match.index}`}
        className="py-0.5 px-1.5 rounded font-mono text-[0.9em] bg-dark-200 dark:bg-dark-800 text-dark-800 dark:text-lime-400"
      >
        {match[1]}
      </code>
    );

    currentIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (currentIndex < text.length) {
    parts.push(
      <React.Fragment key={`post-${currentIndex}`}>
        {parseBoldItalicStrikethrough(text.substring(currentIndex))}
      </React.Fragment>
    );
  }

  return parts.length > 0 ? <>{parts}</> : text;
}

function parseBoldItalicStrikethrough(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let currentIndex = 0;

  // Strikethrough ~~text~~ ([\s\S] allows newlines)
  const strikeRegex = /~~([\s\S]*?)~~/g;
  let match;

  while ((match = strikeRegex.exec(text)) !== null) {
    if (match.index > currentIndex) {
      parts.push(
        <React.Fragment key={`pre-${match.index}`}>
          {parseBoldItalic(text.substring(currentIndex, match.index))}
        </React.Fragment>
      );
    }
    parts.push(
      <del key={`del-${match.index}`} className="text-dark-500 dark:text-dark-400">
        {match[1]}
      </del>
    );
    currentIndex = match.index + match[0].length;
  }

  if (currentIndex < text.length) {
    parts.push(
      <React.Fragment key={`post-${currentIndex}`}>
        {parseBoldItalic(text.substring(currentIndex))}
      </React.Fragment>
    );
  }

  return parts.length > 0 ? <>{parts}</> : text;
}

function parseBoldItalic(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let currentIndex = 0;

  // Bold **text** or __text__ ([\s\S] allows newlines for multi-line bold)
  const boldRegex = /\*\*([\s\S]*?)\*\*|__([\s\S]*?)__/g;
  let match;

  while ((match = boldRegex.exec(text)) !== null) {
    // Add text before bold
    if (match.index > currentIndex) {
      parts.push(
        <React.Fragment key={`pre-${match.index}`}>
          {parseItalic(text.substring(currentIndex, match.index))}
        </React.Fragment>
      );
    }

    // Add bold
    parts.push(
      <strong key={`bold-${match.index}`}>
        {match[1] || match[2]}
      </strong>
    );

    currentIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (currentIndex < text.length) {
    parts.push(
      <React.Fragment key={`post-${currentIndex}`}>
        {parseItalic(text.substring(currentIndex))}
      </React.Fragment>
    );
  }

  return parts.length > 0 ? <>{parts}</> : text;
}

function parseItalic(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let currentIndex = 0;

  // Italic *text* or _text_ ([\s\S] allows newlines for multi-line italic)
  const italicRegex = /(?<!\*)\*([\s\S]*?)\*(?!\*)|(?<!_)_([\s\S]*?)_(?!_)/g;
  let match;

  while ((match = italicRegex.exec(text)) !== null) {
    // Add text before italic
    if (match.index > currentIndex) {
      parts.push(
        <React.Fragment key={`pre-${match.index}`}>
          {parseLinks(text.substring(currentIndex, match.index))}
        </React.Fragment>
      );
    }

    // Add italic
    parts.push(
      <em key={`italic-${match.index}`}>
        {match[1] || match[2]}
      </em>
    );

    currentIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (currentIndex < text.length) {
    parts.push(
      <React.Fragment key={`post-${currentIndex}`}>
        {parseLinks(text.substring(currentIndex))}
      </React.Fragment>
    );
  }

  return parts.length > 0 ? <>{parts}</> : text;
}

function parseLinks(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let currentIndex = 0;

  // Links [text](url)
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  let match;

  while ((match = linkRegex.exec(text)) !== null) {
    // Add text before link
    if (match.index > currentIndex) {
      parts.push(
        <React.Fragment key={`pre-${match.index}`}>
          {text.substring(currentIndex, match.index)}
        </React.Fragment>
      );
    }

    // Add link (theme-aware: light and dark)
    parts.push(
      <a
        key={`link-${match.index}`}
        href={match[2]}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary-600 dark:text-primary-400 underline"
      >
        {match[1]}
      </a>
    );

    currentIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (currentIndex < text.length) {
    parts.push(
      <React.Fragment key={`post-${currentIndex}`}>
        {text.substring(currentIndex)}
      </React.Fragment>
    );
  }

  return parts.length > 0 ? <>{parts}</> : text;
}
