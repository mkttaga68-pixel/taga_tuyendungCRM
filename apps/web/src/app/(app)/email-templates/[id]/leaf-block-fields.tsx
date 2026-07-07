"use client";

import { EMAIL_TEMPLATE_VARIABLES, type EmailLeafBlock } from "@taga-crm/shared";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RichTextEditor } from "./rich-text-editor";

export interface TemplateVariable {
  key: string;
  label: string;
}

interface VariableInsertButtonProps {
  onInsert: (variable: string) => void;
  variables: TemplateVariable[];
}

function VariableInsertButton({ onInsert, variables }: VariableInsertButtonProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" size="sm" variant="ghost" className="h-6 px-2 text-xs">
          + Chèn biến
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72 max-h-72 overflow-y-auto">
        {variables.map((v) => (
          <DropdownMenuItem key={v.key} onClick={() => onInsert(`{{${v.key}}}`)}>
            <div className="flex flex-col gap-0.5">
              <span className="text-sm">{v.label}</span>
              <span className="font-mono text-xs text-muted-foreground">{`{{${v.key}}}`}</span>
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface LeafBlockFieldsProps {
  block: EmailLeafBlock;
  onChange: (next: EmailLeafBlock) => void;
  compact?: boolean;
  variables?: TemplateVariable[];
}

export function LeafBlockFields({ block, onChange, compact, variables }: LeafBlockFieldsProps) {
  const gap = compact ? "space-y-2" : "space-y-3";
  const vars = variables ?? EMAIL_TEMPLATE_VARIABLES;

  if (block.type === "TEXT") {
    return (
      <div className={gap}>
        <Label>Nội dung</Label>
        <RichTextEditor
          key={block.id}
          initialValue={block.content}
          onChange={(html) => onChange({ ...block, content: html })}
          variables={vars}
          minRows={compact ? 3 : 5}
        />
        <div className="flex gap-2">
          <div className="flex-1 space-y-1">
            <Label className="text-xs">Căn lề</Label>
            <Select value={block.align} onValueChange={(v) => onChange({ ...block, align: v as typeof block.align })}>
              <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="left">Trái</SelectItem>
                <SelectItem value="center">Giữa</SelectItem>
                <SelectItem value="right">Phải</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1 space-y-1">
            <Label className="text-xs">Cỡ chữ (px)</Label>
            <Input
              type="number"
              className="h-8"
              value={block.fontSize}
              onChange={(e) => onChange({ ...block, fontSize: Number(e.target.value) || 14 })}
            />
          </div>
        </div>
      </div>
    );
  }

  if (block.type === "IMAGE") {
    return (
      <div className={gap}>
        <div className="space-y-1">
          <Label className="text-xs">URL hình ảnh</Label>
          <Input value={block.url} onChange={(e) => onChange({ ...block, url: e.target.value })} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Alt text</Label>
          <Input value={block.alt ?? ""} onChange={(e) => onChange({ ...block, alt: e.target.value })} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Liên kết khi bấm (tuỳ chọn)</Label>
          <Input value={block.link ?? ""} onChange={(e) => onChange({ ...block, link: e.target.value })} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Độ rộng (px)</Label>
          <Input
            type="number"
            value={block.width}
            onChange={(e) => onChange({ ...block, width: Number(e.target.value) || 300 })}
          />
        </div>
      </div>
    );
  }

  if (block.type === "BUTTON") {
    return (
      <div className={gap}>
        <div className="flex items-center justify-between">
          <Label className="text-xs">Nhãn nút</Label>
          <VariableInsertButton onInsert={(v) => onChange({ ...block, label: block.label + v })} variables={vars} />
        </div>
        <Input value={block.label} onChange={(e) => onChange({ ...block, label: e.target.value })} />
        <div className="space-y-1">
          <Label className="text-xs">URL</Label>
          <Input value={block.url} onChange={(e) => onChange({ ...block, url: e.target.value })} />
        </div>
        <div className="flex gap-2">
          <div className="flex-1 space-y-1">
            <Label className="text-xs">Màu nền</Label>
            <Input
              type="color"
              className="h-8 w-full p-1"
              value={block.color}
              onChange={(e) => onChange({ ...block, color: e.target.value })}
            />
          </div>
          <div className="flex-1 space-y-1">
            <Label className="text-xs">Căn lề</Label>
            <Select value={block.align} onValueChange={(v) => onChange({ ...block, align: v as typeof block.align })}>
              <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="left">Trái</SelectItem>
                <SelectItem value="center">Giữa</SelectItem>
                <SelectItem value="right">Phải</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    );
  }

  if (block.type === "DIVIDER") {
    return (
      <div className={gap}>
        <Label className="text-xs">Màu đường kẻ</Label>
        <Input
          type="color"
          className="h-8 w-full p-1"
          value={block.color}
          onChange={(e) => onChange({ ...block, color: e.target.value })}
        />
      </div>
    );
  }

  if (block.type === "SPACER") {
    return (
      <div className={gap}>
        <Label className="text-xs">Chiều cao (px)</Label>
        <Input
          type="number"
          value={block.height}
          onChange={(e) => onChange({ ...block, height: Number(e.target.value) || 20 })}
        />
      </div>
    );
  }

  // SOCIAL
  return (
    <div className={gap}>
      <Label className="text-xs">Liên kết mạng xã hội</Label>
      {block.links.map((link, idx) => (
        <div key={idx} className="flex gap-2">
          <Input
            placeholder="facebook"
            value={link.platform}
            onChange={(e) => {
              const links = [...block.links];
              links[idx] = { ...links[idx], platform: e.target.value };
              onChange({ ...block, links });
            }}
            className="w-28"
          />
          <Input
            placeholder="https://..."
            value={link.url}
            onChange={(e) => {
              const links = [...block.links];
              links[idx] = { ...links[idx], url: e.target.value };
              onChange({ ...block, links });
            }}
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => onChange({ ...block, links: block.links.filter((_, i) => i !== idx) })}
          >
            Xoá
          </Button>
        </div>
      ))}
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => onChange({ ...block, links: [...block.links, { platform: "", url: "" }] })}
      >
        + Thêm liên kết
      </Button>
    </div>
  );
}
