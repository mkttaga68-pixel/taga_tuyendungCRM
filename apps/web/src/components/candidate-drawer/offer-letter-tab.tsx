"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { downloadOfferLetter } from "@/lib/offer-letter-api";

export function OfferLetterTab({ candidateId }: { candidateId: string }) {
  const [companyName, setCompanyName] = useState("TAGA Global");
  const [position, setPosition] = useState("");
  const [salary, setSalary] = useState("");
  const [startDate, setStartDate] = useState("");
  const [probationPeriod, setProbationPeriod] = useState("");
  const [workLocation, setWorkLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [generating, setGenerating] = useState(false);

  async function handleGenerate() {
    if (!position.trim() || !salary.trim() || !startDate) {
      toast.error("Cần nhập đủ Vị trí, Mức lương và Ngày bắt đầu");
      return;
    }
    setGenerating(true);
    try {
      await downloadOfferLetter(candidateId, {
        companyName,
        position,
        salary,
        startDate,
        probationPeriod: probationPeriod || undefined,
        workLocation: workLocation || undefined,
        notes: notes || undefined,
      });
      toast.success("Đã tạo Offer Letter");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không tạo được Offer Letter");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="space-y-3 pt-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 space-y-1">
          <Label className="text-xs">Tên công ty</Label>
          <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
        </div>
        <div className="col-span-2 space-y-1">
          <Label className="text-xs">Vị trí công việc *</Label>
          <Input value={position} onChange={(e) => setPosition(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Mức lương *</Label>
          <Input value={salary} onChange={(e) => setSalary(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Ngày bắt đầu *</Label>
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Thời gian thử việc</Label>
          <Input value={probationPeriod} onChange={(e) => setProbationPeriod(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Địa điểm làm việc</Label>
          <Input value={workLocation} onChange={(e) => setWorkLocation(e.target.value)} />
        </div>
        <div className="col-span-2 space-y-1">
          <Label className="text-xs">Ghi chú thêm</Label>
          <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
      </div>
      <Button onClick={handleGenerate} disabled={generating}>
        {generating ? "Đang tạo PDF..." : "Tạo & Tải Offer Letter"}
      </Button>
    </div>
  );
}
