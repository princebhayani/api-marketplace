import { useState, useRef } from "react";
import { cn } from "../utils/cn";
import { renderMarkdown } from "../utils/markdown";
import {
  Bold,
  Italic,
  Code,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Link,
  Eye,
  Edit3,
  Strikethrough,
  Quote,
  Minus,
  SquareCode,
  Table,
} from "lucide-react";

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
}

export function MarkdownEditor({ value, onChange, placeholder, label }: MarkdownEditorProps) {
  const [showPreview, setShowPreview] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const insertText = (before: string, after: string = "") => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.focus();

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    const newText = value.substring(0, start) + before + selectedText + after + value.substring(end);
    onChange(newText);

    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + before.length + selectedText.length + after.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 10);
  };

  const insertBlock = (block: string, cursorOffset?: number) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.focus();
    const start = textarea.selectionStart;
    const before = value.substring(0, start);
    const after = value.substring(start);
    const newline = start > 0 && value[start - 1] !== "\n" ? "\n" : "";
    const inserted = newline + block;
    onChange(before + inserted + after);
    setTimeout(() => {
      textarea.focus();
      const pos = cursorOffset !== undefined ? start + newline.length + cursorOffset : start + inserted.length;
      textarea.setSelectionRange(pos, pos);
    }, 10);
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-dark-950 border border-dark-200 dark:border-dark-800 rounded-xl overflow-hidden shadow-soft">
      {label && (
        <label className="label px-4 pt-3 mb-0">
          {label}
        </label>
      )}

      {/* Toolbar */}
      <div className="flex items-center gap-1 p-2 bg-dark-50 dark:bg-dark-900 border-b border-dark-200 dark:border-dark-800 flex-wrap overflow-x-auto scrollbar-hide">
        <div className="flex items-center gap-1 pr-2 border-r border-dark-200 dark:border-dark-700">
          <ToolbarButton onClick={() => insertText("**", "**")} title="Bold" icon={<Bold className="w-4 h-4" />} />
          <ToolbarButton onClick={() => insertText("*", "*")} title="Italic" icon={<Italic className="w-4 h-4" />} />
          <ToolbarButton onClick={() => insertText("~~", "~~")} title="Strikethrough" icon={<Strikethrough className="w-4 h-4" />} />
          <ToolbarButton onClick={() => insertText("`", "`")} title="Inline Code" icon={<Code className="w-4 h-4" />} />
        </div>

        <div className="flex items-center gap-1 px-2 border-r border-dark-200 dark:border-dark-700">
          <ToolbarButton onClick={() => insertText("# ", "")} title="Heading 1" icon={<Heading1 className="w-4 h-4" />} />
          <ToolbarButton onClick={() => insertText("## ", "")} title="Heading 2" icon={<Heading2 className="w-4 h-4" />} />
          <ToolbarButton onClick={() => insertText("### ", "")} title="Heading 3" icon={<Heading3 className="w-4 h-4" />} />
        </div>

        <div className="flex items-center gap-1 px-2 border-r border-dark-200 dark:border-dark-700">
          <ToolbarButton onClick={() => insertText("- ", "")} title="Bullet List" icon={<List className="w-4 h-4" />} />
          <ToolbarButton onClick={() => insertText("1. ", "")} title="Numbered List" icon={<ListOrdered className="w-4 h-4" />} />
        </div>

        <div className="flex items-center gap-1 px-2 border-r border-dark-200 dark:border-dark-700">
          <ToolbarButton onClick={() => insertText("> ", "")} title="Blockquote" icon={<Quote className="w-4 h-4" />} />
          <ToolbarButton onClick={() => insertBlock("```\n\n```", 4)} title="Code Block" icon={<SquareCode className="w-4 h-4" />} />
          <ToolbarButton onClick={() => insertBlock("\n---\n")} title="Horizontal Rule" icon={<Minus className="w-4 h-4" />} />
          <ToolbarButton
            onClick={() =>
              insertBlock(
                "| Header Name | Value |\n|-------------|-------------|\n| X-API-Key | Your API key |\n| Accept | application/json |"
              )
            }
            title="Table"
            icon={<Table className="w-4 h-4" />}
          />
          <ToolbarButton onClick={() => insertText("[", "](url)")} title="Link" icon={<Link className="w-4 h-4" />} />
        </div>

        <div className="ml-auto flex items-center bg-dark-100 dark:bg-dark-800 rounded-lg p-0.5">
          <button
            type="button"
            onClick={() => setShowPreview(false)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all",
              !showPreview ? "bg-white dark:bg-dark-700 text-dark-900 dark:text-white shadow-sm" : "text-dark-500 hover:text-dark-700 dark:hover:text-dark-300"
            )}
          >
            <Edit3 className="w-3.5 h-3.5" />
            Write
          </button>
          <button
            type="button"
            onClick={() => setShowPreview(true)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all",
              showPreview ? "bg-white dark:bg-dark-700 text-dark-900 dark:text-white shadow-sm" : "text-dark-500 hover:text-dark-700 dark:hover:text-dark-300"
            )}
          >
            <Eye className="w-3.5 h-3.5" />
            Preview
          </button>
        </div>
      </div>

      {/* Editor/Preview */}
      <div className="flex-1 min-h-[500px] flex overflow-hidden">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder || "Start writing documentation with Markdown..."}
          className={cn(
            "flex-1 w-full p-6 bg-transparent text-dark-800 dark:text-dark-50 font-mono text-sm leading-relaxed outline-none resize-none scrollbar-thin",
            showPreview && "hidden md:block border-r border-dark-100 dark:border-dark-800 bg-dark-50/30 dark:bg-dark-950/30"
          )}
        />
        {showPreview && (
          <div className="flex-1 w-full p-6 overflow-y-auto bg-dark-50/50 dark:bg-dark-900/30 scrollbar-thin anime-fade-in prose dark:prose-invert max-w-none w-full break-words markdown-new-styling">
            {renderMarkdown(value)}
          </div>
        )}
      </div>

      {/* Bottom info */}
      <div className="px-4 py-2 bg-dark-50 dark:bg-dark-900 border-t border-dark-200 dark:border-dark-800 flex items-center justify-between text-[10px] uppercase font-bold tracking-wider text-dark-400">
        <div className="flex gap-4">
          <span>Markdown Supported</span>
          <span>{value.length} Characters</span>
        </div>
        <div className="flex gap-2">
          <span>Esc to toggle full screen</span>
        </div>
      </div>
    </div>
  );
}

function ToolbarButton({ onClick, title, icon }: { onClick: (e: any) => void; title: string; icon: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        onClick(e);
      }}
      className="p-2 text-dark-500 dark:text-dark-400 hover:bg-white dark:hover:bg-dark-800 hover:text-primary-600 dark:hover:text-primary-400 rounded-lg transition-all"
      title={title}
    >
      {icon}
    </button>
  );
}
