"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getLandingPage } from "@/lib/landing-pages-api";
import { InfoTab } from "./info-tab";
import { FormBuilderTab } from "./form-builder-tab";
import { SubmissionsTab } from "./submissions-tab";
import { TrackingTab } from "./tracking-tab";
import { WebhookTab } from "./webhook-tab";

export default function LandingPageDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const query = useQuery({
    queryKey: ["landing-pages", id],
    queryFn: () => getLandingPage(id),
  });

  if (query.isLoading || !query.data) {
    return <div className="p-6 text-sm text-muted-foreground">Đang tải...</div>;
  }

  const landingPage = query.data;

  return (
    <div className="h-full overflow-auto p-6">
      <Link
        href="/landing-pages"
        className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Landing Page
      </Link>
      <h1 className="mb-1 text-2xl font-semibold tracking-tight">{landingPage.name}</h1>
      <p className="mb-6 font-mono text-sm text-muted-foreground">{landingPage.slug}</p>

      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info">Thông tin</TabsTrigger>
          <TabsTrigger value="webhook">Kết nối Webhook</TabsTrigger>
          <TabsTrigger value="form">Form Builder</TabsTrigger>
          <TabsTrigger value="submissions">
            Submissions ({landingPage.submissionCount})
          </TabsTrigger>
          <TabsTrigger value="tracking">Tracking</TabsTrigger>
        </TabsList>
        <TabsContent value="info">
          <InfoTab landingPage={landingPage} />
        </TabsContent>
        <TabsContent value="webhook">
          <WebhookTab landingPage={landingPage} />
        </TabsContent>
        <TabsContent value="form">
          <FormBuilderTab landingPageId={id} />
        </TabsContent>
        <TabsContent value="submissions">
          <SubmissionsTab landingPageId={id} />
        </TabsContent>
        <TabsContent value="tracking">
          <TrackingTab landingPage={landingPage} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
