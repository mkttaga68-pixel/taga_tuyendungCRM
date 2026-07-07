"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Mail, Phone, Tag, ListFilter, Clock } from "lucide-react";
import { getMktContact, getMktContactTimeline } from "@/lib/mkt-api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

const EVENT_LABELS: Record<string, string> = {
  CONTACT_CREATED: "Contact được tạo",
  LIST_JOINED: "Tham gia danh sách",
  CAMPAIGN_ENROLLED: "Đăng ký chiến dịch",
  EMAIL_SENT: "Email đã gửi",
  EMAIL_OPENED: "Mở email",
  EMAIL_CLICKED: "Click link trong email",
  EMAIL_BOUNCED: "Email bị bounce",
  EMAIL_UNSUBSCRIBED: "Hủy đăng ký",
};

export default function ContactDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { data: contact, isLoading } = useQuery({
    queryKey: ["mkt-contact", id],
    queryFn: () => getMktContact(id),
  });

  const { data: timeline = [] } = useQuery({
    queryKey: ["mkt-contact-timeline", id],
    queryFn: () => getMktContactTimeline(id),
    enabled: !!contact,
  });

  if (isLoading) {
    return (
      <div className="h-full p-6">
        <div className="h-8 w-64 rounded bg-muted animate-pulse mb-4" />
        <div className="h-48 rounded-lg bg-muted animate-pulse" />
      </div>
    );
  }

  if (!contact) {
    return (
      <div className="h-full flex items-center justify-center p-6 text-muted-foreground">
        Không tìm thấy contact
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto p-6 space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/marketing/contacts">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{contact.fullName}</h1>
          <p className="text-sm text-muted-foreground">{contact.email}</p>
        </div>
        {contact.unsubscribed && (
          <Badge variant="destructive" className="ml-2">Đã hủy đăng ký</Badge>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Profile card */}
        <div className="rounded-lg border bg-card p-4 space-y-3">
          <h2 className="font-semibold">Thông tin contact</h2>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span>{contact.email}</span>
            </div>
            {contact.phone && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span>{contact.phone}</span>
              </div>
            )}
            {contact.source && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <span className="font-medium text-foreground">Nguồn:</span>
                {contact.source}
              </div>
            )}
          </div>

          {contact.tags.length > 0 && (
            <div>
              <div className="flex items-center gap-1 mb-1.5 text-xs font-medium text-muted-foreground">
                <Tag className="h-3.5 w-3.5" /> Tags
              </div>
              <div className="flex flex-wrap gap-1">
                {contact.tags.map((t) => (
                  <span
                    key={t.id}
                    className="rounded-full px-2 py-0.5 text-xs font-medium text-white"
                    style={{ backgroundColor: t.color }}
                  >
                    {t.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {contact.lists.length > 0 && (
            <div>
              <div className="flex items-center gap-1 mb-1.5 text-xs font-medium text-muted-foreground">
                <ListFilter className="h-3.5 w-3.5" /> Danh sách
              </div>
              <div className="flex flex-wrap gap-1">
                {contact.lists.map((l) => (
                  <span
                    key={l.id}
                    className="rounded-full px-2 py-0.5 text-xs font-medium text-white"
                    style={{ backgroundColor: l.color }}
                  >
                    {l.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {contact.notes && (
            <div className="text-sm">
              <span className="font-medium">Ghi chú:</span>
              <p className="text-muted-foreground mt-0.5">{contact.notes}</p>
            </div>
          )}

          <div className="text-xs text-muted-foreground pt-1 border-t">
            Tạo lúc: {formatDate(contact.createdAt)}
          </div>
        </div>

        {/* Timeline */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="timeline">
            <TabsList>
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
            </TabsList>
            <TabsContent value="timeline" className="mt-3">
              {timeline.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground text-sm">
                  <Clock className="h-8 w-8 mb-2" />
                  Chưa có hoạt động nào
                </div>
              ) : (
                <div className="space-y-1">
                  {timeline.map((event) => (
                    <div key={event.id} className="flex items-start gap-3 rounded-lg border bg-card p-3">
                      <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">
                          {EVENT_LABELS[event.eventType] ?? event.eventType}
                        </p>
                        {Object.keys(event.meta).length > 0 && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {JSON.stringify(event.meta)}
                          </p>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground flex-shrink-0 tabular-nums">
                        {formatDate(event.occurredAt)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
