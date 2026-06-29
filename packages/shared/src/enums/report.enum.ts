export const AD_SPEND_CHANNELS = ["META", "TIKTOK", "GOOGLE"] as const;
export type AdSpendChannel = (typeof AD_SPEND_CHANNELS)[number];

export const AD_SPEND_CHANNEL_LABELS: Record<AdSpendChannel, string> = {
  META: "Meta (Facebook/Instagram)",
  TIKTOK: "TikTok",
  GOOGLE: "Google Ads",
};

export const REPORT_GROUP_BY = ["day", "week", "month"] as const;
export type ReportGroupBy = (typeof REPORT_GROUP_BY)[number];

export const REPORT_LEADERBOARD_TYPES = ["landing-page", "recruiter", "source"] as const;
export type ReportLeaderboardType = (typeof REPORT_LEADERBOARD_TYPES)[number];
