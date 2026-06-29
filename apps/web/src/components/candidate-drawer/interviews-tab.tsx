"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { INTERVIEW_RESULTS, INTERVIEW_RESULT_LABELS, type InterviewResult } from "@taga-crm/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createInterview, listCandidateInterviews, updateInterview } from "@/lib/interviews-api";
import { lookupUsers } from "@/lib/users-lookup-api";
import { useAuthStore } from "@/stores/auth-store";
import { ApiError } from "@/lib/api-client";

const RESULT_BADGE_VARIANT: Record<InterviewResult, "default" | "secondary" | "destructive" | "outline"> = {
  PENDING: "outline",
  PASSED: "default",
  FAILED: "destructive",
  RESCHEDULED: "secondary",
  NO_SHOW: "secondary",
};

export function InterviewsTab({ candidateId }: { candidateId: string }) {
  const user = useAuthStore((s) => s.user);
  const canSchedule = user?.role === "ADMIN" || user?.role === "HR_MANAGER" || user?.role === "RECRUITER";
  const queryClient = useQueryClient();

  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [interviewerId, setInterviewerId] = useState("");
  const [location, setLocation] = useState("");
  const [createGoogleMeet, setCreateGoogleMeet] = useState(false);

  const query = useQuery({
    queryKey: ["candidates", candidateId, "interviews"],
    queryFn: () => listCandidateInterviews(candidateId),
  });
  const usersQuery = useQuery({ queryKey: ["users-lookup"], queryFn: lookupUsers });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["candidates", candidateId, "interviews"] });

  const createMutation = useMutation({
    mutationFn: () =>
      createInterview(candidateId, {
        scheduledDate,
        scheduledTime,
        interviewerId: interviewerId || undefined,
        location: location || undefined,
        createGoogleMeet: createGoogleMeet || undefined,
      }),
    onSuccess: () => {
      invalidate();
      setScheduledDate("");
      setScheduledTime("");
      setInterviewerId("");
      setLocation("");
      setCreateGoogleMeet(false);
      toast.success("Đã đặt lịch phỏng vấn");
    },
    onError: (error) => {
      toast.error(error instanceof ApiError ? error.message : "Không thể đặt lịch");
    },
  });

  const updateResultMutation = useMutation({
    mutationFn: ({ id, result }: { id: string; result: InterviewResult }) =>
      updateInterview(id, { result }),
    onSuccess: () => {
      invalidate();
      toast.success("Đã cập nhật kết quả");
    },
    onError: (error) => {
      toast.error(error instanceof ApiError ? error.message : "Không thể cập nhật");
    },
  });

  return (
    <div className="space-y-3 pt-4">
      {(query.data ?? []).map((interview) => (
        <div key={interview.id} className="space-y-2 rounded-md border p-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="font-medium">Vòng {interview.round}</span>
            <Select
              value={interview.result}
              onValueChange={(v) =>
                updateResultMutation.mutate({ id: interview.id, result: v as InterviewResult })
              }
            >
              <SelectTrigger className="h-7 w-36">
                <Badge variant={RESULT_BADGE_VARIANT[interview.result]} className="pointer-events-none">
                  <SelectValue />
                </Badge>
              </SelectTrigger>
              <SelectContent>
                {INTERVIEW_RESULTS.map((r) => (
                  <SelectItem key={r} value={r}>
                    {INTERVIEW_RESULT_LABELS[r]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="text-muted-foreground">
            {interview.scheduledDate} · {interview.scheduledTime}
            {interview.location && ` · ${interview.location}`}
          </div>
          {interview.interviewer && (
            <div className="text-muted-foreground">Người phỏng vấn: {interview.interviewer.fullName}</div>
          )}
          {interview.googleMeetLink && (
            <a
              href={interview.googleMeetLink}
              target="_blank"
              rel="noreferrer"
              className="block text-blue-600 underline"
            >
              {interview.googleMeetLink}
            </a>
          )}
          {interview.note && <div className="text-muted-foreground">{interview.note}</div>}
        </div>
      ))}
      {query.data?.length === 0 && !query.isLoading && (
        <p className="text-sm text-muted-foreground">Chưa có lịch phỏng vấn nào.</p>
      )}

      {canSchedule && (
        <div className="space-y-2 rounded-md border p-3">
          <p className="text-sm font-medium">Đặt lịch phỏng vấn mới</p>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Ngày</Label>
              <Input type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Giờ</Label>
              <Input
                type="time"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Người phỏng vấn</Label>
              <Select value={interviewerId || "__none__"} onValueChange={(v) => setInterviewerId(v === "__none__" ? "" : v)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Chọn người phỏng vấn" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">—</SelectItem>
                  {(usersQuery.data ?? []).map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Địa điểm</Label>
              <Input value={location} onChange={(e) => setLocation(e.target.value)} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              checked={createGoogleMeet}
              onCheckedChange={(c) => setCreateGoogleMeet(!!c)}
            />
            <Label className="text-xs font-normal">
              Tự tạo Google Meet (cần Người phỏng vấn đã kết nối Google ở Cài đặt)
            </Label>
          </div>
          <Button
            size="sm"
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending || !scheduledDate || !scheduledTime}
          >
            {createMutation.isPending ? "Đang lưu..." : "Đặt lịch"}
          </Button>
        </div>
      )}
    </div>
  );
}
