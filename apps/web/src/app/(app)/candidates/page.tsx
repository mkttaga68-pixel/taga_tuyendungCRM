import { Suspense } from "react";
import { CandidatesGrid } from "@/components/grid/candidates-grid";

export default function CandidatesPage() {
  return (
    <div className="flex h-full flex-col p-3">
      <Suspense>
        <CandidatesGrid />
      </Suspense>
    </div>
  );
}
