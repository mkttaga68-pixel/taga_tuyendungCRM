export interface CandidateStageHistoryDto {
  id: string;
  candidateId: string;
  fromStage: { id: string; label: string; color: string } | null;
  toStage: { id: string; label: string; color: string };
  changedBy: { id: string; fullName: string } | null;
  changedAt: string;
  note: string | null;
}
