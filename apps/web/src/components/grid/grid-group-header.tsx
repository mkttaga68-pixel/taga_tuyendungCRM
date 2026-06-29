import { ChevronDown } from "lucide-react";

export const GROUP_HEADER_HEIGHT = 32;

export function GridGroupHeaderRow({
  label,
  count,
  width,
}: {
  label: string;
  count: number;
  width: number;
}) {
  return (
    <div
      style={{ width }}
      className="flex h-8 items-center gap-1.5 border-b bg-muted/60 px-3 text-xs font-medium text-foreground"
    >
      <ChevronDown className="size-3.5 text-muted-foreground" />
      {label}
      <span className="text-muted-foreground">({count})</span>
    </div>
  );
}
