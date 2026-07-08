"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  updateLandingPageSchema,
  LANDING_PAGE_STATUS_LABELS,
  type LandingPageDto,
  type UpdateLandingPageInput,
} from "@taga-crm/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { regenerateApiKey, updateLandingPage } from "@/lib/landing-pages-api";
import {
  listMktContactLists,
  getMktLandingPageConfig,
  upsertMktLandingPageConfig,
} from "@/lib/mkt-api";
import { useAuthStore } from "@/stores/auth-store";
import { ApiError } from "@/lib/api-client";

export function InfoTab({ landingPage }: { landingPage: LandingPageDto }) {
  const user = useAuthStore((s) => s.user);
  const canManage = user?.role === "ADMIN" || user?.role === "HR_MANAGER";
  const queryClient = useQueryClient();
  const [regenConfirmOpen, setRegenConfirmOpen] = useState(false);
  const [newApiKey, setNewApiKey] = useState<string | null>(null);

  const form = useForm<UpdateLandingPageInput>({
    resolver: zodResolver(updateLandingPageSchema),
    defaultValues: {
      name: landingPage.name,
      url: landingPage.url,
      domain: landingPage.domain ?? "",
      description: landingPage.description ?? "",
      status: landingPage.status,
    },
  });

  const updateMutation = useMutation({
    mutationFn: (input: UpdateLandingPageInput) => updateLandingPage(landingPage.id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["landing-pages"] });
      toast.success("Đã lưu thay đổi");
    },
    onError: (error) => {
      toast.error(error instanceof ApiError ? error.message : "Không thể lưu thay đổi");
    },
  });

  const regenMutation = useMutation({
    mutationFn: () => regenerateApiKey(landingPage.id),
    onSuccess: (result) => {
      setNewApiKey(result.apiKey);
      setRegenConfirmOpen(false);
    },
    onError: (error) => {
      toast.error(error instanceof ApiError ? error.message : "Không thể tạo lại API key");
    },
  });

  const listsQuery = useQuery({
    queryKey: ["mkt-contact-lists"],
    queryFn: listMktContactLists,
  });

  const configQuery = useQuery({
    queryKey: ["mkt-landing-page-config", landingPage.id],
    queryFn: () => getMktLandingPageConfig(landingPage.id),
  });

  const configMutation = useMutation({
    mutationFn: (listId: string | null) =>
      upsertMktLandingPageConfig(landingPage.id, {
        defaultListId: listId ?? undefined,
        defaultCampaignId: configQuery.data?.defaultCampaignId ?? undefined,
        defaultTagIds: configQuery.data?.defaultTagIds ?? [],
        sourceLabel: configQuery.data?.sourceLabel ?? undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mkt-landing-page-config", landingPage.id] });
      queryClient.invalidateQueries({ queryKey: ["landing-pages"] });
      toast.success("Đã lưu danh bạ");
    },
    onError: () => toast.error("Không thể lưu danh bạ"),
  });

  return (
    <div className="grid gap-4 pt-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Thông tin cơ bản</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-3"
            onSubmit={form.handleSubmit((values) => updateMutation.mutate(values))}
          >
            <div className="space-y-2">
              <Label htmlFor="info-name">Tên</Label>
              <Input id="info-name" disabled={!canManage} {...form.register("name")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="info-url">URL</Label>
              <Input id="info-url" disabled={!canManage} {...form.register("url")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="info-domain">Domain</Label>
              <Input id="info-domain" disabled={!canManage} {...form.register("domain")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="info-description">Mô tả</Label>
              <Textarea id="info-description" disabled={!canManage} {...form.register("description")} />
            </div>
            <div className="space-y-2">
              <Label>Trạng thái</Label>
              <Select
                disabled={!canManage}
                value={form.watch("status") ?? landingPage.status}
                onValueChange={(v) =>
                  form.setValue("status", v as UpdateLandingPageInput["status"])
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(LANDING_PAGE_STATUS_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {canManage && (
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Đang lưu..." : "Lưu thay đổi"}
              </Button>
            )}
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Danh bạ Marketing</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Khi ứng viên có email nộp form qua landing page này, hệ thống tự động thêm vào danh bạ
            được chọn để chạy chiến dịch email marketing.
          </p>
          <div className="space-y-2">
            <Label>Gán vào danh bạ</Label>
            <Select
              disabled={!canManage || configMutation.isPending || listsQuery.isLoading}
              value={configQuery.data?.defaultListId ?? "__none__"}
              onValueChange={(v) => configMutation.mutate(v === "__none__" ? null : v)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Chọn danh bạ..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Không gán</SelectItem>
                {(listsQuery.data ?? []).map((list) => (
                  <SelectItem key={list.id} value={list.id}>
                    {list.name}
                    {list.memberCount > 0 && (
                      <span className="ml-1 text-xs text-muted-foreground">
                        ({list.memberCount})
                      </span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {listsQuery.data?.length === 0 && (
            <p className="text-xs text-muted-foreground">
              Chưa có danh bạ nào. Vào{" "}
              <a href="/marketing/contacts" className="underline">
                Marketing Hub → Danh bạ
              </a>{" "}
              để tạo danh bạ đầu tiên.
            </p>
          )}
        </CardContent>
      </Card>

      {canManage && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">API Key (Ingestion)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              API key dùng trong query <code>?key=</code> khi landing page gửi form về endpoint{" "}
              <code className="break-all">/public/landing-pages/{landingPage.slug}/submit</code>. Vì
              lý do bảo mật, hệ thống chỉ hiển thị key 1 lần ngay sau khi tạo/tạo lại — nếu mất key,
              phải tạo lại (key cũ sẽ ngừng hoạt động ngay).
            </p>
            <Button variant="outline" onClick={() => setRegenConfirmOpen(true)}>
              Tạo lại API key
            </Button>
          </CardContent>
        </Card>
      )}

      <Dialog open={regenConfirmOpen} onOpenChange={setRegenConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tạo lại API key?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Key cũ sẽ ngừng hoạt động ngay lập tức. Nếu landing page thật đang dùng key cũ, bạn cần
            cập nhật lại key mới trên trang đó trước khi key cũ hết hiệu lực, nếu không form sẽ nhận
            lỗi 401 khi ứng viên nộp.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRegenConfirmOpen(false)}>
              Huỷ
            </Button>
            <Button variant="destructive" onClick={() => regenMutation.mutate()}>
              Xác nhận tạo lại
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!newApiKey} onOpenChange={(open) => !open && setNewApiKey(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>API key mới</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Lưu lại ngay — sẽ không hiển thị lại lần nào nữa.
          </p>
          <div className="rounded-md border bg-muted p-3 font-mono text-xs break-all">
            {newApiKey}
          </div>
          <DialogFooter>
            <Button onClick={() => setNewApiKey(null)}>Đã lưu, đóng lại</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
