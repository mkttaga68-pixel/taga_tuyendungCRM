"use client";

import { useQueries, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getActiveForm, listLandingPages } from "@/lib/landing-pages-api";

/**
 * Form schema thuộc về 1 Landing Page cụ thể (landing_page_forms), không có
 * "thư viện form" độc lập — trang này chỉ là điểm vào nhanh để mở thẳng tab
 * Form Builder của từng Landing Page mà không cần qua trang danh sách trước.
 */
export default function FormsIndexPage() {
  const landingPagesQuery = useQuery({ queryKey: ["landing-pages"], queryFn: listLandingPages });
  const landingPages = landingPagesQuery.data ?? [];

  const activeFormQueries = useQueries({
    queries: landingPages.map((lp) => ({
      queryKey: ["landing-pages", lp.id, "forms", "active"],
      queryFn: () => getActiveForm(lp.id),
      enabled: landingPages.length > 0,
    })),
  });

  return (
    <div className="h-full space-y-6 overflow-auto p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Form Builder</h1>
        <p className="text-muted-foreground">
          Mỗi Landing Page có 1 form riêng (versioned) — chọn Landing Page để chỉnh field.
        </p>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Landing Page</TableHead>
              <TableHead>Version đang dùng</TableHead>
              <TableHead className="text-right">Số field</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {landingPages.map((lp, index) => {
              const activeForm = activeFormQueries[index]?.data;
              return (
                <TableRow key={lp.id}>
                  <TableCell className="font-medium">{lp.name}</TableCell>
                  <TableCell>
                    {activeForm ? (
                      <Badge variant="outline">v{activeForm.version}</Badge>
                    ) : (
                      <span className="text-muted-foreground">Chưa cấu hình</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">{activeForm?.schema.fields.length ?? 0}</TableCell>
                  <TableCell className="text-right">
                    <Link
                      href={`/landing-pages/${lp.id}`}
                      className="text-sm font-medium text-primary hover:underline"
                    >
                      Sửa Form →
                    </Link>
                  </TableCell>
                </TableRow>
              );
            })}
            {landingPages.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                  Chưa có Landing Page nào — tạo Landing Page trước khi cấu hình Form.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
