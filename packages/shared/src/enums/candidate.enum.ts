export const GENDERS = ["MALE", "FEMALE", "OTHER"] as const;
export type Gender = (typeof GENDERS)[number];

export const GENDER_LABELS: Record<Gender, string> = {
  MALE: "Nam",
  FEMALE: "Nữ",
  OTHER: "Khác",
};

export const CANDIDATE_SOURCES = ["LANDING_PAGE", "REFERRAL", "HEADHUNTER", "MANUAL", "OTHER"] as const;
export type CandidateSource = (typeof CANDIDATE_SOURCES)[number];

export const CANDIDATE_SOURCE_LABELS: Record<CandidateSource, string> = {
  LANDING_PAGE: "Landing Page",
  REFERRAL: "Giới thiệu",
  HEADHUNTER: "Headhunter",
  MANUAL: "Nhập tay",
  OTHER: "Khác",
};
