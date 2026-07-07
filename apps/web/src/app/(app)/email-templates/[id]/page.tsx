"use client";

import { use, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, ChevronDown, Eye } from "lucide-react";
import { EMAIL_TEMPLATE_VARIABLES, type EmailBlock, type EmailTemplateDto } from "@taga-crm/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getEmailTemplate, renderEmailBlocksPreview, updateEmailTemplate } from "@/lib/email-templates-api";
import { listFieldDefinitions } from "@/lib/field-definitions-api";
import { ApiError } from "@/lib/api-client";
import { EmailBuilder } from "./email-builder";

export default function EmailTemplateBuilderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const query = useQuery({ queryKey: ["email-templates", id], queryFn: () => getEmailTemplate(id) });

  if (!query.data) {
    return <div className="p-6 text-sm text-muted-foreground">Đang tải...</div>;
  }

  return <TemplateEditor key={query.data.id} id={id} template={query.data} />;
}

function TemplateEditor({ id, template }: { id: string; template: EmailTemplateDto }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(template.name);
  const [subject, setSubject] = useState(template.subject);
  const [blocks, setBlocks] = useState<EmailBlock[]>(template.blocks);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const subjectRef = useRef<HTMLInputElement>(null);

  const fieldDefsQuery = useQuery({
    queryKey: ["field-definitions", "candidates"],
    queryFn: () => listFieldDefinitions("candidates"),
    staleTime: 60_000,
  });

  const variables = useMemo(() => {
    const customFieldVars =
      (fieldDefsQuery.data ?? [])
        .filter((f) => !f.isSystem)
        .map((f) => ({
          key: `candidate.customFields.${f.fieldKey}`,
          label: f.label,
        }));
    return [...EMAIL_TEMPLATE_VARIABLES, ...customFieldVars];
  }, [fieldDefsQuery.data]);

  function insertSubjectVariable(key: string) {
    const el = subjectRef.current;
    const token = `{{${key}}}`;
    if (!el) {
      setSubject((s) => s + token);
      return;
    }
    const start = el.selectionStart ?? subject.length;
    const end = el.selectionEnd ?? subject.length;
    const next = subject.slice(0, start) + token + subject.slice(end);
    setSubject(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + token.length, start + token.length);
    });
  }

  const saveMutation = useMutation({
    mutationFn: () => updateEmailTemplate(id, { name, subject, blocks }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-templates"] });
      toast.success("Đã lưu mẫu email");
    },
    onError: (error) => {
      toast.error(error instanceof ApiError ? error.message : "Không thể lưu mẫu email");
    },
  });

  const previewMutation = useMutation({
    mutationFn: () => renderEmailBlocksPreview(blocks),
    onSuccess: (result) => setPreviewHtml(result.html),
    onError: (error) => {
      toast.error(error instanceof ApiError ? error.message : "Không thể tạo xem trước");
    },
  });

  return (
    <div className="flex h-full flex-col overflow-hidden p-6">
      <Link
        href="/email-templates"
        className="mb-2 inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Email Template
      </Link>

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Tên mẫu</Label>
          <Input className="w-56" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="flex-1 space-y-1">
          <Label className="text-xs">Tiêu đề email (subject)</Label>
          <div className="flex gap-1">
            <Input
              ref={subjectRef}
              className="flex-1"
              placeholder="VD: Thư mời phỏng vấn — {{candidate.fullName}}"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="outline" className="shrink-0 gap-1 text-xs">
                  Chèn biến <ChevronDown className="size-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-72 max-h-64 overflow-y-auto">
                {variables.map((v) => (
                  <DropdownMenuItem key={v.key} onSelect={() => insertSubjectVariable(v.key)}>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm">{v.label}</span>
                      <span className="font-mono text-xs text-muted-foreground">{`{{${v.key}}}`}</span>
                    </div>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => previewMutation.mutate()}
          disabled={previewMutation.isPending}
        >
          <Eye className="mr-1 size-4" />
          {previewMutation.isPending ? "Đang tạo..." : "Xem trước"}
        </Button>
        <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
          {saveMutation.isPending ? "Đang lưu..." : "Lưu"}
        </Button>
      </div>

      <div className="min-h-0 flex-1">
        <EmailBuilder blocks={blocks} onChange={setBlocks} variables={variables} />
      </div>

      <Dialog open={!!previewHtml} onOpenChange={(next) => !next && setPreviewHtml(null)}>
        <DialogContent className="max-h-[85vh] max-w-3xl overflow-hidden p-0">
          <DialogHeader className="p-4 pb-0">
            <DialogTitle>Xem trước email</DialogTitle>
          </DialogHeader>
          <iframe title="Xem trước email" srcDoc={previewHtml ?? ""} className="h-[70vh] w-full" />
        </DialogContent>
      </Dialog>
    </div>
  );
}
