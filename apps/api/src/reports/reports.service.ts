import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import type {
  ReportLeaderboardQuery,
  ReportLeaderboardResponse,
  ReportOverviewDto,
  ReportOverviewQuery,
  ReportSeriesPointDto,
} from "@taga-crm/shared";
import { PrismaService } from "../prisma/prisma.service";

interface BucketRow {
  bucket: Date;
}
interface CountBucketRow extends BucketRow {
  count: number;
}
interface CostBucketRow extends BucketRow {
  cost: number;
}
interface Ga4BucketRow extends BucketRow {
  visitors: number;
  sessions: number;
  page_views: number;
  bounce_rate: number;
  avg_time_seconds: number;
}

const HIRED_STAGE_KEY = "CHINH_THUC";

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview(query: ReportOverviewQuery): Promise<ReportOverviewDto> {
    const dateFrom = new Date(`${query.dateFrom}T00:00:00.000Z`);
    const dateToExclusive = new Date(`${query.dateTo}T00:00:00.000Z`);
    dateToExclusive.setUTCDate(dateToExclusive.getUTCDate() + 1);
    const landingPageFilter = query.landingPageId ?? null;

    const hiredStage = await this.prisma.pipelineStage.findUnique({
      where: { key: HIRED_STAGE_KEY },
      select: { id: true },
    });

    const [formRows, hireRows, costRows, ga4Rows, ga4Configured] = await Promise.all([
      this.prisma.$queryRaw<CountBucketRow[]>(Prisma.sql`
        SELECT date_trunc(${query.groupBy}, submitted_at) AS bucket, COUNT(*)::int AS count
        FROM form_submissions
        WHERE submitted_at >= ${dateFrom} AND submitted_at < ${dateToExclusive}
          AND (${landingPageFilter}::uuid IS NULL OR landing_page_id = ${landingPageFilter}::uuid)
        GROUP BY bucket ORDER BY bucket
      `),
      hiredStage
        ? this.prisma.$queryRaw<CountBucketRow[]>(Prisma.sql`
            SELECT date_trunc(${query.groupBy}, csh.changed_at) AS bucket, COUNT(*)::int AS count
            FROM candidate_stage_history csh
            JOIN candidates c ON c.id = csh.candidate_id
            WHERE csh.to_stage_id = ${hiredStage.id}::uuid
              AND csh.changed_at >= ${dateFrom} AND csh.changed_at < ${dateToExclusive}
              AND (${landingPageFilter}::uuid IS NULL OR c.landing_page_id = ${landingPageFilter}::uuid)
            GROUP BY bucket ORDER BY bucket
          `)
        : Promise.resolve([]),
      this.prisma.$queryRaw<CostBucketRow[]>(Prisma.sql`
        SELECT date_trunc(${query.groupBy}, date) AS bucket, COALESCE(SUM(amount), 0)::float8 AS cost
        FROM ad_spend
        WHERE date >= ${query.dateFrom}::date AND date <= ${query.dateTo}::date
          AND (${landingPageFilter}::uuid IS NULL OR landing_page_id = ${landingPageFilter}::uuid)
        GROUP BY bucket ORDER BY bucket
      `),
      this.prisma.$queryRaw<Ga4BucketRow[]>(Prisma.sql`
        SELECT date_trunc(${query.groupBy}, date) AS bucket,
          COALESCE(SUM(visitors), 0)::int AS visitors,
          COALESCE(SUM(sessions), 0)::int AS sessions,
          COALESCE(SUM(page_views), 0)::int AS page_views,
          COALESCE(AVG(bounce_rate), 0)::float8 AS bounce_rate,
          COALESCE(AVG(avg_time_seconds), 0)::float8 AS avg_time_seconds
        FROM landing_page_metrics_daily
        WHERE date >= ${query.dateFrom}::date AND date <= ${query.dateTo}::date
          AND (${landingPageFilter}::uuid IS NULL OR landing_page_id = ${landingPageFilter}::uuid)
        GROUP BY bucket ORDER BY bucket
      `),
      this.isGa4Configured(landingPageFilter),
    ]);

    const buckets = new Map<string, ReportSeriesPointDto>();
    const ensure = (date: Date): ReportSeriesPointDto => {
      const key = date.toISOString().slice(0, 10);
      let point = buckets.get(key);
      if (!point) {
        point = {
          bucket: key,
          formSubmits: 0,
          hires: 0,
          cost: 0,
          visitors: 0,
          sessions: 0,
          pageViews: 0,
        };
        buckets.set(key, point);
      }
      return point;
    };

    for (const row of formRows) ensure(row.bucket).formSubmits = row.count;
    for (const row of hireRows) ensure(row.bucket).hires = row.count;
    for (const row of costRows) ensure(row.bucket).cost = row.cost;
    for (const row of ga4Rows) {
      const point = ensure(row.bucket);
      point.visitors = row.visitors;
      point.sessions = row.sessions;
      point.pageViews = row.page_views;
    }

    const series = Array.from(buckets.values()).sort((a, b) => a.bucket.localeCompare(b.bucket));

    const totalFormSubmits = series.reduce((sum, p) => sum + p.formSubmits, 0);
    const totalHires = series.reduce((sum, p) => sum + p.hires, 0);
    const totalCost = series.reduce((sum, p) => sum + p.cost, 0);
    const totalVisitors = series.reduce((sum, p) => sum + p.visitors, 0);
    const totalSessions = series.reduce((sum, p) => sum + p.sessions, 0);
    const totalPageViews = series.reduce((sum, p) => sum + p.pageViews, 0);
    const avgBounceRate = ga4Rows.length
      ? ga4Rows.reduce((sum, r) => sum + r.bounce_rate, 0) / ga4Rows.length
      : 0;
    const avgTimeSeconds = ga4Rows.length
      ? ga4Rows.reduce((sum, r) => sum + r.avg_time_seconds, 0) / ga4Rows.length
      : 0;

    return {
      totals: {
        formSubmits: totalFormSubmits,
        hires: totalHires,
        cost: totalCost,
        costPerForm: totalFormSubmits > 0 ? totalCost / totalFormSubmits : 0,
        costPerHire: totalHires > 0 ? totalCost / totalHires : 0,
        visitors: totalVisitors,
        sessions: totalSessions,
        pageViews: totalPageViews,
        bounceRate: avgBounceRate,
        avgTimeSeconds,
      },
      series,
      ga4Configured,
    };
  }

  async getLeaderboard(query: ReportLeaderboardQuery): Promise<ReportLeaderboardResponse> {
    const dateFrom = new Date(`${query.dateFrom}T00:00:00.000Z`);
    const dateToExclusive = new Date(`${query.dateTo}T00:00:00.000Z`);
    dateToExclusive.setUTCDate(dateToExclusive.getUTCDate() + 1);

    const hiredStage = await this.prisma.pipelineStage.findUnique({
      where: { key: HIRED_STAGE_KEY },
      select: { id: true },
    });
    const hiredStageId = hiredStage?.id ?? null;

    if (query.type === "landing-page") {
      const rows = await this.prisma.$queryRaw<
        { key: string; label: string; count: number; hires: number }[]
      >(
        Prisma.sql`
        WITH form_counts AS (
          SELECT landing_page_id, COUNT(*)::int AS count
          FROM form_submissions
          WHERE submitted_at >= ${dateFrom} AND submitted_at < ${dateToExclusive}
          GROUP BY landing_page_id
        ), hire_counts AS (
          SELECT c.landing_page_id, COUNT(*)::int AS hires
          FROM candidate_stage_history csh
          JOIN candidates c ON c.id = csh.candidate_id
          WHERE csh.to_stage_id = ${hiredStageId}::uuid
            AND csh.changed_at >= ${dateFrom} AND csh.changed_at < ${dateToExclusive}
          GROUP BY c.landing_page_id
        )
        SELECT lp.id AS key, lp.name AS label,
          COALESCE(fc.count, 0) AS count,
          COALESCE(hc.hires, 0) AS hires
        FROM landing_pages lp
        LEFT JOIN form_counts fc ON fc.landing_page_id = lp.id
        LEFT JOIN hire_counts hc ON hc.landing_page_id = lp.id
        WHERE lp.deleted_at IS NULL
        ORDER BY count DESC, hires DESC
        LIMIT ${query.limit}
      `,
      );
      return { items: rows };
    }

    if (query.type === "recruiter") {
      const rows = await this.prisma.$queryRaw<
        { key: string; label: string; count: number; hires: number }[]
      >(
        Prisma.sql`
        WITH candidate_counts AS (
          SELECT recruiter_id, COUNT(*)::int AS count
          FROM candidates
          WHERE created_at >= ${dateFrom} AND created_at < ${dateToExclusive} AND deleted_at IS NULL
          GROUP BY recruiter_id
        ), hire_counts AS (
          SELECT c.recruiter_id, COUNT(*)::int AS hires
          FROM candidate_stage_history csh
          JOIN candidates c ON c.id = csh.candidate_id
          WHERE csh.to_stage_id = ${hiredStageId}::uuid
            AND csh.changed_at >= ${dateFrom} AND csh.changed_at < ${dateToExclusive}
          GROUP BY c.recruiter_id
        )
        SELECT u.id AS key, u.full_name AS label,
          COALESCE(cc.count, 0) AS count,
          COALESCE(hc.hires, 0) AS hires
        FROM users u
        LEFT JOIN candidate_counts cc ON cc.recruiter_id = u.id
        LEFT JOIN hire_counts hc ON hc.recruiter_id = u.id
        WHERE u.deleted_at IS NULL AND (cc.count > 0 OR hc.hires > 0)
        ORDER BY hires DESC, count DESC
        LIMIT ${query.limit}
      `,
      );
      return { items: rows };
    }

    const rows = await this.prisma.$queryRaw<
      { key: string; label: string; count: number; hires: number }[]
    >(
      Prisma.sql`
      WITH candidate_counts AS (
        SELECT source, COUNT(*)::int AS count
        FROM candidates
        WHERE created_at >= ${dateFrom} AND created_at < ${dateToExclusive} AND deleted_at IS NULL
        GROUP BY source
      ), hire_counts AS (
        SELECT c.source, COUNT(*)::int AS hires
        FROM candidate_stage_history csh
        JOIN candidates c ON c.id = csh.candidate_id
        WHERE csh.to_stage_id = ${hiredStageId}::uuid
          AND csh.changed_at >= ${dateFrom} AND csh.changed_at < ${dateToExclusive}
        GROUP BY c.source
      )
      SELECT cc.source AS key, cc.source AS label,
        COALESCE(cc.count, 0) AS count,
        COALESCE(hc.hires, 0) AS hires
      FROM candidate_counts cc
      LEFT JOIN hire_counts hc ON hc.source = cc.source
      ORDER BY count DESC, hires DESC
      LIMIT ${query.limit}
    `,
    );
    return { items: rows };
  }

  private async isGa4Configured(landingPageId: string | null): Promise<boolean> {
    const rows = await this.prisma.landingPage.findMany({
      where: { deletedAt: null, ...(landingPageId ? { id: landingPageId } : {}) },
      select: { trackingConfig: true },
    });
    return rows.some((row) => {
      const config = row.trackingConfig as { ga4PropertyId?: string } | null;
      return !!config?.ga4PropertyId;
    });
  }
}
