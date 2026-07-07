"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  EMAIL_TEMPLATE_VARIABLES,
  sendEmailSchema,
  type SendEmailInput,
} from "@taga-crm/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { sendEmail } from "@/lib/email-logs-api";
import { ApiError } from "@/lib/api-client";
import { listEmailTemplates } from "@/lib/email-templates-api";

export default function ComposePage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const form = useForm<SendEmailInput>({
    resolver: zodResolver(sendEmailSchema),
    defaultValues: {
      to: "",
      subject: "",
      bodyTemplate: "",
      candidateId: undefined,
    },
  });

  // Điền sẵn từ query params (khi nhấn "Trả lời" ở Inbox)
  useEffect(() => {
    const to = searchParams.get("replyTo");
    const subject = searchParams.get("subject");
    const candidateId = searchParams.get("candidateId");
    if (to) form.setValue("to", to);
    if (subject) form.setValue("subject", subject);
    if (candidateId && candidateId !== "null") form.setValue("candidateId", candidateId);
  }, [searchParams, form]);

  const templatesQuery = useQuery({
    queryKey: ["email-templates"],
    queryFn: listEmailTemplates,
    staleTime: 30_000,
  });

  const sendMutation = useMutation({
    mutationFn: sendEmail,
    onSuccess: () => {
      toast.success("Đã gửi email thành công");
      router.push("/emails/sent");
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : "Không thể gửi email");
    },
  });

  function insertVariable(key: string) {
    const current = form.getValues("bodyTemplate");
    form.setValue("bodyTemplate", current + `{{${key}}}`);
  }

  const bodyValue = form.watch("bodyTemplate");

  return (
    <div className="h-full overflow-auto p-6">
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Soạn thư</h1>
          <p className="text-muted-foreground">Gửi email thủ công tới bất kỳ địa chỉ nào.</p>
        </div>

        <form
          className="space-y-4"
          onSubmit={form.handleSubmit((values) => sendMutation.mutate(values))}
        >
          <div className="space-y-2">
            <Label htmlFor="to">Gửi tới *</Label>
            <Input
              id="to"
              type="email"
              placeholder="email@example.com"
              {...form.register("to")}
            />
            {form.formState.errors.to && (
              <p className="text-sm text-destructive">{form.formState.errors.to.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">Tiêu đề *</Label>
            <Input
              id="subject"
              placeholder="Tiêu đề email..."
              {...form.register("subject")}
            />
            {form.formState.errors.subject && (
              <p className="text-sm text-destructive">{form.formState.errors.subject.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="body">Nội dung *</Label>
              <span className="text-xs text-muted-foreground">
                Dùng <code>**text**</code> để in đậm, xuống dòng bình thường
              </span>
            </div>

            {/* Biến chèn nhanh */}
            <div className="flex flex-wrap gap-1">
              <TooltipProvider>
                {EMAIL_TEMPLATE_VARIABLES.map((v) => (
                  <Tooltip key={v.key}>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={() => insertVariable(v.key)}
                        className="rounded border px-2 py-0.5 text-xs hover:bg-muted"
                      >
                        {"{{"}{v.key}{"}}"}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>{v.label}</TooltipContent>
                  </Tooltip>
                ))}
              </TooltipProvider>
            </div>

            <Textarea
              id="body"
              rows={12}
              placeholder="Nội dung email... Hỗ trợ **in đậm** và xuống dòng."
              {...form.register("bodyTemplate")}
            />
            {form.formState.errors.bodyTemplate && (
              <p className="text-sm text-destructive">{form.formState.errors.bodyTemplate.message}</p>
            )}
            <p className="text-xs text-muted-foreground text-right">
              {bodyValue.length} ký tự
            </p>
          </div>

          {/* Gợi ý dùng template nếu có */}
          {(templatesQuery.data?.length ?? 0) > 0 && (
            <div className="rounded-md border p-3 space-y-2">
              <p className="text-sm font-medium">Dùng nhanh từ Email Template</p>
              <div className="flex flex-wrap gap-2">
                {templatesQuery.data?.map((t) => (
                  <Badge
                    key={t.id}
                    variant="outline"
                    className="cursor-pointer hover:bg-muted"
                    onClick={() => {
                      if (t.subject && !form.getValues("subject")) {
                        form.setValue("subject", t.subject);
                      }
                    }}
                  >
                    {t.name}
                  </Badge>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Click vào template để tự động điền tiêu đề. Nội dung vẫn cần nhập tay ở ô trên.
              </p>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
            >
              Huỷ
            </Button>
            <Button type="submit" disabled={sendMutation.isPending}>
              {sendMutation.isPending ? "Đang gửi..." : "Gửi email"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
