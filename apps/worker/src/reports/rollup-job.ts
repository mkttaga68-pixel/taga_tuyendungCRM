import type { PrismaClient } from "@prisma/client";
import { fetchGa4DailyMetrics } from "./ga4-client";

const HIRED_STAGE_KEY = "CHINH_THUC";

function yesterdayIso(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

/**
 * Rollup KPI 1 ngày cho TẤT CẢ landing page vào landing_page_metrics_daily.
 * visitors/sessions/pageViews/bounceRate/avgTimeSeconds lấy từ GA4 Data API
 * (chỉ khi landing page đã cấu hình trackingConfig.ga4PropertyId) — nếu
 * GOOGLE_GA4_SERVICE_ACCOUNT_JSON chưa cấu hình hoặc property đó lỗi, log
 * cảnh báo và để các số GA4 = 0 cho ngày đó, KHÔNG chặn việc rollup
 * formSubmits/hires/cost (3 số này luôn tính được từ dữ liệu nội bộ).
 */
export async function runDailyRollup(prisma: PrismaClient, targetDate?: string): Promise<void> {
  const dateIso = targetDate ?? yesterdayIso();
  const dayStart = new Date(`${dateIso}T00:00:00.000Z`);
  const dayEnd = new Date(dayStart);
  dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);

  const hiredStage = await prisma.pipelineStage.findUnique({
    where: { key: HIRED_STAGE_KEY },
    select: { id: true },
  });

  const landingPages = await prisma.landingPage.findMany({ where: { deletedAt: null } });
  console.log(`[reports-rollup] Rollup ngày ${dateIso} cho ${landingPages.length} landing page`);

  for (const lp of landingPages) {
    const trackingConfig = lp.trackingConfig as { ga4PropertyId?: string } | null;
    const ga4PropertyId = trackingConfig?.ga4PropertyId;

    let visitors = 0;
    let sessions = 0;
    let pageViews = 0;
    let bounceRate = 0;
    let avgTimeSeconds = 0;
    let source = "INTERNAL";

    if (ga4PropertyId) {
      try {
        const metrics = await fetchGa4DailyMetrics(ga4PropertyId, dateIso);
        visitors = metrics.visitors;
        sessions = metrics.sessions;
        pageViews = metrics.pageViews;
        bounceRate = metrics.bounceRate;
        avgTimeSeconds = metrics.avgTimeSeconds;
        source = "GA4";
      } catch (err) {
        const message = err instanceof Error ? err.message : "Lỗi không xác định";
        console.warn(`[reports-rollup] GA4 pull thất bại cho landing page ${lp.id} (${lp.name}): ${message}`);
      }
    }

    const formSubmits = await prisma.formSubmission.count({
      where: { landingPageId: lp.id, submittedAt: { gte: dayStart, lt: dayEnd } },
    });

    const hires = hiredStage
      ? await prisma.candidateStageHistory.count({
          where: {
            toStageId: hiredStage.id,
            changedAt: { gte: dayStart, lt: dayEnd },
            candidate: { landingPageId: lp.id },
          },
        })
      : 0;

    const costAgg = await prisma.adSpend.aggregate({
      where: { landingPageId: lp.id, date: { gte: dayStart, lt: dayEnd } },
      _sum: { amount: true },
    });
    const cost = Number(costAgg._sum.amount ?? 0);
    const conversionRate = visitors > 0 ? formSubmits / visitors : 0;

    await prisma.landingPageMetricDaily.upsert({
      where: { landingPageId_date: { landingPageId: lp.id, date: dayStart } },
      create: {
        landingPageId: lp.id,
        date: dayStart,
        visitors,
        sessions,
        pageViews,
        formSubmits,
        conversionRate,
        bounceRate,
        avgTimeSeconds: Math.round(avgTimeSeconds),
        cost,
        costPerForm: formSubmits > 0 ? cost / formSubmits : 0,
        costPerHire: hires > 0 ? cost / hires : 0,
        source,
      },
      update: {
        visitors,
        sessions,
        pageViews,
        formSubmits,
        conversionRate,
        bounceRate,
        avgTimeSeconds: Math.round(avgTimeSeconds),
        cost,
        costPerForm: formSubmits > 0 ? cost / formSubmits : 0,
        costPerHire: hires > 0 ? cost / hires : 0,
        source,
      },
    });
  }

  console.log(`[reports-rollup] Hoàn tất rollup ngày ${dateIso}`);
}
