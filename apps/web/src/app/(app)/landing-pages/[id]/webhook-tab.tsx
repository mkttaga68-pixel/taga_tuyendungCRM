"use client";

import { useState } from "react";
import { Check, Copy, AlertTriangle, ExternalLink } from "lucide-react";
import type { LandingPageDto } from "@taga-crm/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

const FIELD_MAPPINGS = [
  { label: "Họ và tên", aliases: ["Họ và tên", "ho_va_ten", "fullName", "name"], target: "Tên ứng viên" },
  { label: "Số điện thoại", aliases: ["Số điện thoại", "so_dien_thoai", "phone", "sdt"], target: "SĐT" },
  { label: "Email", aliases: ["Email", "email"], target: "Email" },
  { label: "Ngày sinh", aliases: ["Ngày sinh", "ngay_sinh", "dob"], target: "Ngày sinh" },
  { label: "Địa chỉ", aliases: ["Địa chỉ", "dia_chi", "address"], target: "Địa chỉ" },
  { label: "Khu vực", aliases: ["Khu vực", "khu_vuc", "area"], target: "Khu vực / Chi nhánh" },
  { label: "Giới tính", aliases: ["Giới tính", "gioi_tinh", "gender"], target: "Giới tính" },
  { label: "Facebook", aliases: ["Facebook", "facebook", "fb_link"], target: "Link Facebook" },
];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <Button size="sm" variant="outline" onClick={handleCopy} className="shrink-0">
      {copied ? <Check className="mr-1.5 h-3.5 w-3.5 text-green-600" /> : <Copy className="mr-1.5 h-3.5 w-3.5" />}
      {copied ? "Đã sao chép" : "Sao chép"}
    </Button>
  );
}

function CodeBlock({ children }: { children: string }) {
  return (
    <div className="flex items-center gap-2 rounded-md border bg-muted px-3 py-2">
      <code className="flex-1 break-all font-mono text-xs">{children}</code>
      <CopyButton text={children} />
    </div>
  );
}

export function WebhookTab({ landingPage }: { landingPage: LandingPageDto }) {
  const endpointUrl = `${API_URL}/public/landing-pages/${landingPage.slug}/submit`;
  const fullUrl = `${endpointUrl}?key=YOUR_API_KEY`;

  return (
    <div className="space-y-4 pt-4">
      {landingPage.status !== "ACTIVE" && (
        <div className="flex items-start gap-2 rounded-md border border-yellow-200 bg-yellow-50 px-3 py-2 text-sm text-yellow-800 dark:border-yellow-800 dark:bg-yellow-950 dark:text-yellow-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Landing Page đang ở trạng thái <strong>{landingPage.status}</strong>. Webhook sẽ trả về
            lỗi 404 cho đến khi trạng thái được đổi sang <strong>Đang chạy</strong>.
          </span>
        </div>
      )}

      {/* Endpoint URL */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Địa chỉ Webhook</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Sao chép URL đầy đủ bên dưới, sau đó thay <code className="rounded bg-muted px-1 font-mono text-xs">YOUR_API_KEY</code> bằng API key của Landing Page này (xem tab{" "}
            <strong>Thông tin</strong>).
          </p>
          <CodeBlock>{fullUrl}</CodeBlock>

          <div className="rounded-md border p-3 text-sm">
            <p className="mb-2 font-medium">Thông tin kết nối</p>
            <div className="grid gap-1.5 text-muted-foreground">
              <div className="flex gap-2">
                <span className="w-28 shrink-0">Phương thức</span>
                <Badge variant="secondary" className="font-mono">POST</Badge>
              </div>
              <div className="flex gap-2">
                <span className="w-28 shrink-0">Content-Type</span>
                <code className="text-xs">application/json</code>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-28 shrink-0">API Key</span>
                <span className="text-xs">
                  Query string <code>?key=YOUR_API_KEY</code> — không đặt trong Header
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ladipage guide */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            Hướng dẫn kết nối Ladipage
            <a
              href="https://help.ladipage.vn"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-4 text-sm">
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">1</span>
              <div>
                <p className="font-medium">Mở cài đặt Form trên Ladipage</p>
                <p className="mt-0.5 text-muted-foreground">
                  Vào trang Ladipage → chọn Form → <strong>Cài đặt</strong> → tab{" "}
                  <strong>Kết nối</strong> (hoặc <strong>Tích hợp</strong>).
                </p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">2</span>
              <div>
                <p className="font-medium">Thêm kết nối Webhook</p>
                <p className="mt-0.5 text-muted-foreground">
                  Chọn <strong>Webhook</strong> → <strong>Thêm webhook</strong>.
                  Phương thức chọn <strong>POST</strong>.
                </p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">3</span>
              <div>
                <p className="font-medium">Dán URL webhook</p>
                <p className="mt-0.5 mb-2 text-muted-foreground">
                  Dán URL đầy đủ (đã có <code>?key=</code>) vào ô <strong>Địa chỉ webhook</strong>:
                </p>
                <CodeBlock>{fullUrl}</CodeBlock>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">4</span>
              <div>
                <p className="font-medium">Lưu và kiểm tra</p>
                <p className="mt-0.5 text-muted-foreground">
                  Nhấn <strong>Lưu</strong>, sau đó gửi thử 1 form thật trên Ladipage.
                  Kiểm tra tab <strong>Submissions</strong> trong CRM để xác nhận data đã về.
                </p>
              </div>
            </li>
          </ol>
        </CardContent>
      </Card>

      {/* Field mapping */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Mapping tên trường</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-3 text-sm text-muted-foreground">
            CRM tự nhận diện tên trường từ Ladipage. Đặt tên field trong Ladipage Form khớp một
            trong các tên bên dưới để dữ liệu được map đúng vào ứng viên.
          </p>
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Trường trong CRM</th>
                  <th className="px-3 py-2 text-left font-medium">Tên field Ladipage chấp nhận</th>
                </tr>
              </thead>
              <tbody>
                {FIELD_MAPPINGS.map((row, i) => (
                  <tr key={row.label} className={i % 2 === 0 ? "" : "bg-muted/20"}>
                    <td className="px-3 py-2 font-medium">{row.target}</td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1">
                        {row.aliases.map((alias) => (
                          <code
                            key={alias}
                            className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs"
                          >
                            {alias}
                          </code>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Các trường không khớp vẫn được lưu trong <strong>Submissions</strong> (raw payload) nhưng
            sẽ không được điền vào hồ sơ ứng viên.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
