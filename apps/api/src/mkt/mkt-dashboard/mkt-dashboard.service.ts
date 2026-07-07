import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import type { MktDashboardStats } from "@taga-crm/shared";

@Injectable()
export class MktDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats(): Promise<MktDashboardStats> {
    const [totalContacts, totalLists, totalCampaigns, totalEmailsSent, totalOpened, totalClicked] =
      await Promise.all([
        this.prisma.mktContact.count({ where: { deletedAt: null, unsubscribed: false } }),
        this.prisma.mktContactList.count({ where: { deletedAt: null } }),
        this.prisma.mktCampaign.count({ where: { deletedAt: null } }),
        this.prisma.mktEmailSend.count({ where: { status: "SENT" } }),
        this.prisma.mktEmailEvent.count({ where: { eventType: "OPEN" } }),
        this.prisma.mktEmailEvent.count({ where: { eventType: "CLICK" } }),
      ]);

    const recentCampaignRows = await this.prisma.mktCampaign.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    const recentCampaigns = await Promise.all(
      recentCampaignRows.map(async (c) => {
        const sent = await this.prisma.mktEmailSend.count({
          where: { campaignEmail: { campaignId: c.id }, status: "SENT" },
        });
        const opened = await this.prisma.mktEmailEvent.count({
          where: { send: { campaignEmail: { campaignId: c.id } }, eventType: "OPEN" },
        });
        const clicked = await this.prisma.mktEmailEvent.count({
          where: { send: { campaignEmail: { campaignId: c.id } }, eventType: "CLICK" },
        });
        return {
          id: c.id,
          name: c.name,
          status: c.status as MktDashboardStats["recentCampaigns"][number]["status"],
          sent,
          openRate: sent > 0 ? Math.round((opened / sent) * 10000) / 100 : 0,
          ctr: sent > 0 ? Math.round((clicked / sent) * 10000) / 100 : 0,
        };
      }),
    );

    return {
      totalContacts,
      totalLists,
      totalCampaigns,
      totalEmailsSent,
      overallOpenRate:
        totalEmailsSent > 0 ? Math.round((totalOpened / totalEmailsSent) * 10000) / 100 : 0,
      overallCtr:
        totalEmailsSent > 0 ? Math.round((totalClicked / totalEmailsSent) * 10000) / 100 : 0,
      recentCampaigns,
    };
  }
}
