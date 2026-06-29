"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { listCandidates } from "@/lib/candidates-api";
import { Input } from "@/components/ui/input";

export function CandidatePicker({ onPick }: { onPick: (candidateId: string, name: string) => void }) {
  const [search, setSearch] = useState("");
  const query = useQuery({
    queryKey: ["candidates", "picker", search],
    queryFn: () => listCandidates({ search, limit: 8 }),
    enabled: search.trim().length > 0,
  });

  return (
    <div className="space-y-2">
      <Input
        placeholder="Tìm ứng viên để Test Run..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        autoFocus
      />
      <div className="max-h-60 space-y-1 overflow-y-auto">
        {(query.data?.items ?? []).map((c) => (
          <button
            key={c.id}
            type="button"
            className="block w-full rounded-md border px-2 py-1.5 text-left text-sm hover:bg-muted"
            onClick={() => onPick(c.id, c.fullName)}
          >
            {c.fullName} {c.phone && <span className="text-muted-foreground">· {c.phone}</span>}
          </button>
        ))}
        {search.trim() && query.data?.items.length === 0 && (
          <p className="px-2 py-1.5 text-sm text-muted-foreground">Không tìm thấy.</p>
        )}
      </div>
    </div>
  );
}
