"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { AD_SPEND_CHANNELS, AD_SPEND_CHANNEL_LABELS, type AdSpendChannel } from "@taga-crm/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { listLandingPages } from "@/lib/landing-pages-api";
import { createAdSpend, deleteAdSpend, listAdSpend } from "@/lib/ad-spend-api";
import { ApiError } from "@/lib/api-client";

function formatCurrency(n: number): string {
  return new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(n) + "đ";
}

export function AdSpendTab() {
  const queryClient = useQueryClient();
  const [landingPageId, setLandingPageId] = useState("__none__");
  const [channel, setChannel] = useState<AdSpendChannel>("META");
  const [date, setDate] = useState("");
  const [amount, setAmount] = useState("");

  const landingPagesQuery = useQuery({ queryKey: ["landing-pages"], queryFn: listLandingPages });
  const listQuery = useQuery({
    queryKey: ["ad-spend"],
    queryFn: () => listAdSpend({ limit: 100 }),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      createAdSpend({
        landingPageId: landingPageId === "__none__" ? undefined : landingPageId,
        channel,
        date,
        amount: Number(amount),
        currency: "VND",
        source: "MANUAL",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ad-spend"] });
      setDate("");
      setAmount("");
      toast.success("Đã thêm chi phí quảng cáo");
    },
    onError: (error) => {
      toast.error(error instanceof ApiError ? error.message : "Không thể thêm chi phí");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteAdSpend(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ad-spend"] });
      toast.success("Đã xoá");
    },
    onError: (error) => {
      toast.error(error instanceof ApiError ? error.message : "Không thể xoá");
    },
  });

  return (
    <div className="space-y-4 pt-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Thêm chi phí quảng cáo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            <div className="space-y-1">
              <Label className="text-xs">Landing Page</Label>
              <Select value={landingPageId} onValueChange={setLandingPageId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Không gắn (chi phí chung)</SelectItem>
                  {(landingPagesQuery.data ?? []).map((lp) => (
                    <SelectItem key={lp.id} value={lp.id}>
                      {lp.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Kênh</Label>
              <Select value={channel} onValueChange={(v) => setChannel(v as AdSpendChannel)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AD_SPEND_CHANNELS.map((c) => (
                    <SelectItem key={c} value={c}>
                      {AD_SPEND_CHANNEL_LABELS[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Ngày</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Số tiền (VNĐ)</Label>
              <Input type="number" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div className="flex items-end">
              <Button
                onClick={() => createMutation.mutate()}
                disabled={createMutation.isPending || !date || !amount}
              >
                {createMutation.isPending ? "Đang lưu..." : "Thêm"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Lịch sử chi phí</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ngày</TableHead>
                <TableHead>Landing Page</TableHead>
                <TableHead>Kênh</TableHead>
                <TableHead className="text-right">Số tiền</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {(listQuery.data?.items ?? []).map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{row.date}</TableCell>
                  <TableCell>{row.landingPageName ?? "—"}</TableCell>
                  <TableCell>{AD_SPEND_CHANNEL_LABELS[row.channel]}</TableCell>
                  <TableCell className="text-right">{formatCurrency(row.amount)}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteMutation.mutate(row.id)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {listQuery.data?.items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    Chưa có chi phí quảng cáo nào
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
