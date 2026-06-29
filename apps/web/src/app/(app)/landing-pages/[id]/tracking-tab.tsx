"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Copy, Check } from "lucide-react";
import {
  landingPageTrackingConfigSchema,
  type LandingPageDto,
  type LandingPageTrackingConfig,
} from "@taga-crm/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { updateLandingPage } from "@/lib/landing-pages-api";
import { useAuthStore } from "@/stores/auth-store";
import { ApiError } from "@/lib/api-client";

function buildGa4Snippet(id: string) {
  return `<!-- Google tag (gtag.js) - GA4 -->
<script async src="https://www.googletagmanager.com/gtag/js?id=${id}"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', '${id}');
</script>`;
}

function buildGtmHeadSnippet(id: string) {
  return `<!-- Google Tag Manager -->
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${id}');</script>
<!-- End Google Tag Manager -->`;
}

function buildGtmBodySnippet(id: string) {
  return `<!-- Google Tag Manager (noscript) -->
<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=${id}"
height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
<!-- End Google Tag Manager (noscript) -->`;
}

function buildMetaPixelSnippet(id: string) {
  return `<!-- Meta Pixel Code -->
<script>
!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${id}');
fbq('track', 'PageView');
</script>
<noscript><img height="1" width="1" style="display:none"
src="https://www.facebook.com/tr?id=${id}&ev=PageView&noscript=1"
/></noscript>
<!-- End Meta Pixel Code -->`;
}

function buildTiktokPixelSnippet(id: string) {
  return `<!-- TikTok Pixel Code -->
<script>
!function (w, d, t) {
  w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie","holdConsent","revokeConsent","grantConsent"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<e.length;n++)ttq.setAndDefer(e,e.methods[n]);return e},ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js",o=n&&n.partner;ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=i,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};n=document.createElement("script");n.type="text/javascript",n.async=!0,n.src=i+"?sdkid="+e+"&lib="+t;e=document.getElementsByTagName("script")[0];e.parentNode.insertBefore(n,e)};
  ttq.load('${id}');
  ttq.page();
}(window, document, 'ttq');
</script>
<!-- End TikTok Pixel Code -->`;
}

function CodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="relative">
      <pre className="max-h-64 overflow-auto rounded-md border bg-muted p-3 text-xs whitespace-pre-wrap">
        {code}
      </pre>
      <Button
        type="button"
        size="icon"
        variant="outline"
        className="absolute top-2 right-2 size-7"
        onClick={() => {
          navigator.clipboard.writeText(code).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }).catch(() => undefined);
        }}
      >
        {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      </Button>
    </div>
  );
}

export function TrackingTab({ landingPage }: { landingPage: LandingPageDto }) {
  const user = useAuthStore((s) => s.user);
  const canManage = user?.role === "ADMIN" || user?.role === "HR_MANAGER";
  const queryClient = useQueryClient();

  const form = useForm<LandingPageTrackingConfig>({
    resolver: zodResolver(landingPageTrackingConfigSchema),
    defaultValues: {
      ga4MeasurementId: landingPage.trackingConfig.ga4MeasurementId ?? "",
      ga4PropertyId: landingPage.trackingConfig.ga4PropertyId ?? "",
      gtmContainerId: landingPage.trackingConfig.gtmContainerId ?? "",
      metaPixelId: landingPage.trackingConfig.metaPixelId ?? "",
      tiktokPixelId: landingPage.trackingConfig.tiktokPixelId ?? "",
    },
  });

  const updateMutation = useMutation({
    mutationFn: (input: LandingPageTrackingConfig) =>
      updateLandingPage(landingPage.id, { trackingConfig: input }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["landing-pages"] });
      toast.success("Đã lưu cấu hình tracking");
    },
    onError: (error) => {
      toast.error(error instanceof ApiError ? error.message : "Không thể lưu cấu hình tracking");
    },
  });

  const ga4Id = form.watch("ga4MeasurementId");
  const gtmId = form.watch("gtmContainerId");
  const metaId = form.watch("metaPixelId");
  const tiktokId = form.watch("tiktokPixelId");

  return (
    <div className="grid gap-4 pt-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Cấu hình ID Tracking</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-3"
            onSubmit={form.handleSubmit((values) => updateMutation.mutate(values))}
          >
            <div className="space-y-2">
              <Label htmlFor="trk-ga4">GA4 Measurement ID</Label>
              <Input
                id="trk-ga4"
                placeholder="G-XXXXXXXXXX"
                disabled={!canManage}
                {...form.register("ga4MeasurementId")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="trk-ga4-property">
                GA4 Property ID <span className="text-muted-foreground">(cho Báo cáo, khác Measurement ID)</span>
              </Label>
              <Input
                id="trk-ga4-property"
                placeholder="123456789"
                disabled={!canManage}
                {...form.register("ga4PropertyId")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="trk-gtm">GTM Container ID</Label>
              <Input
                id="trk-gtm"
                placeholder="GTM-XXXXXXX"
                disabled={!canManage}
                {...form.register("gtmContainerId")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="trk-meta">Meta Pixel ID</Label>
              <Input
                id="trk-meta"
                placeholder="123456789012345"
                disabled={!canManage}
                {...form.register("metaPixelId")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="trk-tiktok">TikTok Pixel ID</Label>
              <Input
                id="trk-tiktok"
                placeholder="C4XXXXXXXXXXXXXXXXXX"
                disabled={!canManage}
                {...form.register("tiktokPixelId")}
              />
            </div>
            {canManage && (
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Đang lưu..." : "Lưu cấu hình"}
              </Button>
            )}
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Mã nhúng (dán vào landing page)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!ga4Id && !gtmId && !metaId && !tiktokId && (
            <p className="text-sm text-muted-foreground">
              Nhập ít nhất 1 ID bên trái để xem mã nhúng tương ứng tại đây.
            </p>
          )}
          {ga4Id && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">
                GA4 — dán vào <code>&lt;head&gt;</code>
              </p>
              <CodeBlock code={buildGa4Snippet(ga4Id)} />
            </div>
          )}
          {gtmId && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">
                GTM — dán vào <code>&lt;head&gt;</code>
              </p>
              <CodeBlock code={buildGtmHeadSnippet(gtmId)} />
              <p className="pt-1 text-xs font-medium text-muted-foreground">
                GTM — dán ngay sau mở thẻ <code>&lt;body&gt;</code>
              </p>
              <CodeBlock code={buildGtmBodySnippet(gtmId)} />
            </div>
          )}
          {metaId && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">
                Meta Pixel — dán vào <code>&lt;head&gt;</code>
              </p>
              <CodeBlock code={buildMetaPixelSnippet(metaId)} />
            </div>
          )}
          {tiktokId && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">
                TikTok Pixel — dán vào <code>&lt;head&gt;</code>
              </p>
              <CodeBlock code={buildTiktokPixelSnippet(tiktokId)} />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
