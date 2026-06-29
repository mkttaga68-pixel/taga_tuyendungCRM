"use client";

import { forwardRef, useState } from "react";
import { Plus } from "lucide-react";
import { Input } from "@/components/ui/input";

interface AddRecordRowProps {
  totalWidth: number;
  onSubmit: (fullName: string) => void;
}

export const AddRecordRow = forwardRef<HTMLInputElement, AddRecordRowProps>(function AddRecordRow(
  { totalWidth, onSubmit },
  ref,
) {
  const [value, setValue] = useState("");

  function commit() {
    const trimmed = value.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
    setValue("");
  }

  return (
    <div style={{ width: totalWidth }} className="flex h-9 shrink-0 items-center border-b px-2">
      <Plus className="mr-2 size-4 text-muted-foreground" />
      <Input
        ref={ref}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && commit()}
        onBlur={commit}
        placeholder="Thêm bản ghi — nhập tên rồi Enter"
        className="h-7 border-0 px-0 shadow-none focus-visible:ring-0"
      />
    </div>
  );
});
