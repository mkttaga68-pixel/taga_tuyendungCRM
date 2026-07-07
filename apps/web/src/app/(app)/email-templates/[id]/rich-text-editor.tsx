"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { TemplateVariable } from "./leaf-block-fields";

interface RichTextEditorProps {
  initialValue: string;
  onChange: (html: string) => void;
  variables?: TemplateVariable[];
  minRows?: number;
}

export function RichTextEditor({
  initialValue,
  onChange,
  variables = [],
  minRows = 5,
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const savedRangeRef = useRef<Range | null>(null);
  const [showLink, setShowLink] = useState(false);
  const [linkHref, setLinkHref] = useState("");
  const [linkText, setLinkText] = useState("");

  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.innerHTML = initialValue;
    }
    // only on mount — intentionally uncontrolled after mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function saveSelection() {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      savedRangeRef.current = sel.getRangeAt(0).cloneRange();
    }
  }

  function restoreSelection() {
    const sel = window.getSelection();
    if (sel && savedRangeRef.current) {
      sel.removeAllRanges();
      sel.addRange(savedRangeRef.current);
    }
  }

  function emitChange() {
    if (editorRef.current) onChange(editorRef.current.innerHTML);
  }

  function execFmt(cmd: string) {
    editorRef.current?.focus();
    document.execCommand(cmd, false, undefined);
    emitChange();
  }

  function handleLinkConfirm() {
    if (!linkHref) return;
    restoreSelection();
    editorRef.current?.focus();
    const sel = window.getSelection();
    const displayText = linkText || (sel ? sel.toString() : "") || linkHref;
    document.execCommand(
      "insertHTML",
      false,
      `<a href="${linkHref}" target="_blank" rel="noopener noreferrer">${displayText}</a>`,
    );
    emitChange();
    setShowLink(false);
    setLinkHref("");
    setLinkText("");
  }

  function insertVariable(token: string) {
    restoreSelection();
    editorRef.current?.focus();
    document.execCommand("insertHTML", false, token);
    emitChange();
  }

  return (
    <div className="overflow-hidden rounded-md border">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 border-b bg-muted/30 px-2 py-1">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-7 w-7 p-0 text-sm font-bold"
          title="In đậm (Ctrl+B)"
          onMouseDown={(e) => {
            e.preventDefault();
            execFmt("bold");
          }}
        >
          B
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-7 w-7 p-0 text-sm italic font-serif"
          title="In nghiêng (Ctrl+I)"
          onMouseDown={(e) => {
            e.preventDefault();
            execFmt("italic");
          }}
        >
          I
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-7 gap-1 px-2 text-xs"
          title="Chèn liên kết"
          onMouseDown={(e) => {
            e.preventDefault();
            saveSelection();
            const sel = window.getSelection();
            setLinkText(sel ? sel.toString() : "");
            setShowLink((v) => !v);
          }}
        >
          🔗 Link
        </Button>
        {variables.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-7 gap-1 px-2 text-xs"
                onMouseDown={(e) => {
                  e.preventDefault();
                  saveSelection();
                }}
              >
                Chèn biến <ChevronDown className="size-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-72 max-h-64 overflow-y-auto">
              {variables.map((v) => (
                <DropdownMenuItem key={v.key} onSelect={() => insertVariable(`{{${v.key}}}`)}>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm">{v.label}</span>
                    <span className="font-mono text-xs text-muted-foreground">{`{{${v.key}}}`}</span>
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Link input row */}
      {showLink && (
        <div className="flex flex-wrap items-center gap-2 border-b bg-muted/20 px-2 py-1.5">
          <Input
            className="h-7 w-36 text-xs"
            placeholder="Chữ hiển thị (tuỳ chọn)"
            value={linkText}
            onChange={(e) => setLinkText(e.target.value)}
          />
          <Input
            className="h-7 min-w-[180px] flex-1 text-xs"
            placeholder="URL (https://...)"
            value={linkHref}
            onChange={(e) => setLinkHref(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleLinkConfirm();
              }
              if (e.key === "Escape") {
                setShowLink(false);
                setLinkHref("");
                setLinkText("");
              }
            }}
            autoFocus
          />
          <Button
            type="button"
            size="sm"
            className="h-7 px-3 text-xs"
            disabled={!linkHref}
            onClick={handleLinkConfirm}
          >
            Chèn
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs"
            onClick={() => {
              setShowLink(false);
              setLinkHref("");
              setLinkText("");
            }}
          >
            Huỷ
          </Button>
        </div>
      )}

      {/* Editable area */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        className="px-3 py-2 text-sm outline-none [&_a]:cursor-pointer [&_a]:text-blue-600 [&_a]:underline [&_b]:font-bold [&_em]:italic [&_i]:italic [&_strong]:font-bold [&_u]:underline"
        style={{ minHeight: `${minRows * 1.5}rem` }}
        onInput={emitChange}
        onSelect={saveSelection}
        onKeyUp={saveSelection}
        onMouseUp={saveSelection}
      />
    </div>
  );
}
