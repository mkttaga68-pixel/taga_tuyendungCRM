"use client";

import { useEffect, useState } from "react";
import { Plus, X } from "lucide-react";
import type { FieldDefinitionDto, UpdateFieldDefinitionInput } from "@taga-crm/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

const CHOICE_COLORS = [
  "#EF4444", "#F97316", "#EAB308", "#22C55E",
  "#14B8A6", "#3B82F6", "#8B5CF6", "#EC4899",
  "#6B7280", "#D97706", "#10B981", "#6366F1",
];

interface SelectChoice {
  label: string;
  color: string;
}

interface EditFieldDialogProps {
  field: FieldDefinitionDto;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (input: UpdateFieldDefinitionInput) => void;
}

export function EditFieldDialog({ field, open, onOpenChange, onSave }: EditFieldDialogProps) {
  const [label, setLabel] = useState(field.label);
  const [selectOptions, setSelectOptions] = useState<SelectChoice[]>([]);
  const [selectOptionInput, setSelectOptionInput] = useState("");

  useEffect(() => {
    if (open) {
      setLabel(field.label);
      const choices = (field.options?.choices as SelectChoice[] | undefined) ?? [];
      setSelectOptions(choices.map((c) => ({ label: c.label, color: c.color })));
      setSelectOptionInput("");
    }
  }, [open, field]);

  const isSelectType = field.fieldType === "SELECT" || field.fieldType === "MULTI_SELECT";

  function addOption() {
    const v = selectOptionInput.trim();
    if (!v || selectOptions.some((o) => o.label === v)) return;
    const color = CHOICE_COLORS[selectOptions.length % CHOICE_COLORS.length];
    setSelectOptions((prev) => [...prev, { label: v, color }]);
    setSelectOptionInput("");
  }

  function handleSave() {
    const trimmed = label.trim();
    if (!trimmed) return;
    const input: UpdateFieldDefinitionInput = { label: trimmed };
    if (isSelectType) {
      input.options = {
        choices: selectOptions.map((o) => ({
          value: o.label.toLowerCase().trim().replace(/\s+/g, "_"),
          label: o.label,
          color: o.color,
        })),
      };
    }
    onSave(input);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Chỉnh sửa trường</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="edit-field-label">Tên trường</Label>
            <Input
              id="edit-field-label"
              autoFocus
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !isSelectType) handleSave(); }}
            />
          </div>

          {isSelectType && (
            <div className="space-y-1.5">
              <Label>
                Các lựa chọn
                {selectOptions.length > 0 && (
                  <span className="ml-1 text-xs text-muted-foreground">({selectOptions.length})</span>
                )}
              </Label>
              <div className="flex gap-1">
                <Input
                  className="h-7 text-xs"
                  placeholder="Nhập lựa chọn..."
                  value={selectOptionInput}
                  onChange={(e) => setSelectOptionInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") { e.preventDefault(); addOption(); }
                  }}
                />
                <button
                  type="button"
                  onClick={addOption}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border bg-muted hover:bg-muted/60"
                >
                  <Plus className="size-3.5" />
                </button>
              </div>
              {selectOptions.length > 0 && (
                <div className="flex max-h-52 flex-col gap-1 overflow-y-auto pt-0.5">
                  {selectOptions.map((opt, idx) => (
                    <div key={idx} className="flex items-center gap-1.5">
                      <button
                        type="button"
                        title="Đổi màu (click để đổi)"
                        onClick={() =>
                          setSelectOptions((prev) =>
                            prev.map((o, i) =>
                              i === idx
                                ? {
                                    ...o,
                                    color:
                                      CHOICE_COLORS[
                                        (CHOICE_COLORS.indexOf(o.color) + 1) % CHOICE_COLORS.length
                                      ],
                                  }
                                : o,
                            ),
                          )
                        }
                        className="size-4 shrink-0 rounded-full border border-white/50 shadow-sm"
                        style={{ backgroundColor: opt.color }}
                      />
                      <span
                        className="flex-1 truncate rounded-md px-2 py-0.5 text-xs font-medium"
                        style={{ backgroundColor: `${opt.color}26`, color: opt.color }}
                      >
                        {opt.label}
                      </span>
                      <button
                        type="button"
                        onClick={() => setSelectOptions((o) => o.filter((_, i) => i !== idx))}
                        className="shrink-0 text-muted-foreground hover:text-destructive"
                      >
                        <X className="size-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Huỷ
          </Button>
          <Button size="sm" onClick={handleSave} disabled={!label.trim()}>
            Lưu thay đổi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
