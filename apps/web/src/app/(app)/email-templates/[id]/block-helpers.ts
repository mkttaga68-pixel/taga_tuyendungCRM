import type { EmailBlock, EmailBlockType } from "@taga-crm/shared";

export function createDefaultBlock(type: EmailBlockType): EmailBlock {
  const id = crypto.randomUUID();
  switch (type) {
    case "TEXT":
      return { id, type: "TEXT", content: "Nhập nội dung...", align: "left", fontSize: 14 };
    case "IMAGE":
      return { id, type: "IMAGE", url: "https://via.placeholder.com/300x120", width: 300 };
    case "BUTTON":
      return {
        id,
        type: "BUTTON",
        label: "Bấm vào đây",
        url: "https://",
        color: "#111827",
        align: "center",
      };
    case "DIVIDER":
      return { id, type: "DIVIDER", color: "#e5e7eb" };
    case "SPACER":
      return { id, type: "SPACER", height: 20 };
    case "SOCIAL":
      return { id, type: "SOCIAL", links: [] };
    case "SECTION":
      return { id, type: "SECTION", backgroundColor: "#ffffff", padding: 16, blocks: [] };
  }
}

export function describeBlock(block: EmailBlock): string {
  switch (block.type) {
    case "TEXT":
      return block.content.slice(0, 60) || "(trống)";
    case "IMAGE":
      return block.url || "(chưa có URL)";
    case "BUTTON":
      return `${block.label} → ${block.url}`;
    case "DIVIDER":
      return "Đường kẻ ngang";
    case "SPACER":
      return `Khoảng trống ${block.height}px`;
    case "SOCIAL":
      return `${block.links.length} liên kết mạng xã hội`;
    case "SECTION":
      return `${block.blocks.length} block con`;
  }
}
