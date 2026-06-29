"use client";

import { useQuery } from "@tanstack/react-query";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getCandidate } from "@/lib/candidates-api";
import { useAuthStore } from "@/stores/auth-store";
import { InfoTab } from "./info-tab";
import { TimelineTab } from "./timeline-tab";
import { CvTab } from "./cv-tab";
import { InterviewsTab } from "./interviews-tab";
import { CommentsTab } from "./comments-tab";
import { OfferLetterTab } from "./offer-letter-tab";

export function CandidateDrawer({
  candidateId,
  onClose,
}: {
  candidateId: string | null;
  onClose: () => void;
}) {
  const user = useAuthStore((s) => s.user);
  const canGenerateOffer =
    user?.role === "ADMIN" || user?.role === "HR_MANAGER" || user?.role === "RECRUITER";

  const query = useQuery({
    queryKey: ["candidates", "detail", candidateId],
    queryFn: () => getCandidate(candidateId!),
    enabled: !!candidateId,
  });

  return (
    <Sheet open={!!candidateId} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>{query.data?.fullName ?? "Chi tiết ứng viên"}</SheetTitle>
        </SheetHeader>

        {query.data && candidateId && (
          <div className="px-4 pb-6">
            <Tabs defaultValue="info">
              <TabsList>
                <TabsTrigger value="info">Thông tin</TabsTrigger>
                <TabsTrigger value="timeline">Timeline</TabsTrigger>
                <TabsTrigger value="cv">CV</TabsTrigger>
                <TabsTrigger value="interviews">Phỏng vấn</TabsTrigger>
                <TabsTrigger value="comments">Comment</TabsTrigger>
                {canGenerateOffer && <TabsTrigger value="offer">Offer Letter</TabsTrigger>}
              </TabsList>
              <TabsContent value="info">
                <InfoTab candidate={query.data} />
              </TabsContent>
              <TabsContent value="timeline">
                <TimelineTab candidateId={candidateId} />
              </TabsContent>
              <TabsContent value="cv">
                <CvTab candidateId={candidateId} />
              </TabsContent>
              <TabsContent value="interviews">
                <InterviewsTab candidateId={candidateId} />
              </TabsContent>
              <TabsContent value="comments">
                <CommentsTab candidateId={candidateId} />
              </TabsContent>
              {canGenerateOffer && (
                <TabsContent value="offer">
                  <OfferLetterTab candidateId={candidateId} />
                </TabsContent>
              )}
            </Tabs>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
