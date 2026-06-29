import mjml2html from "mjml";
import type { EmailBlock, EmailLeafBlock } from "@taga-crm/shared";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderLeafBlock(block: EmailLeafBlock): string {
  switch (block.type) {
    case "TEXT":
      return `<mj-text align="${block.align}" font-size="${block.fontSize}px">${escapeHtml(
        block.content,
      ).replace(/\n/g, "<br/>")}</mj-text>`;
    case "IMAGE":
      return `<mj-image src="${escapeHtml(block.url)}" alt="${escapeHtml(block.alt ?? "")}" width="${block.width}px"${
        block.link ? ` href="${escapeHtml(block.link)}"` : ""
      } />`;
    case "BUTTON":
      return `<mj-button href="${escapeHtml(block.url)}" background-color="${escapeHtml(
        block.color,
      )}" align="${block.align}">${escapeHtml(block.label)}</mj-button>`;
    case "DIVIDER":
      return `<mj-divider border-color="${escapeHtml(block.color)}" />`;
    case "SPACER":
      return `<mj-spacer height="${block.height}px" />`;
    case "SOCIAL":
      return `<mj-social>${block.links
        .map(
          (link) =>
            `<mj-social-element name="${escapeHtml(link.platform.toLowerCase())}" href="${escapeHtml(
              link.url,
            )}">${escapeHtml(link.platform)}</mj-social-element>`,
        )
        .join("")}</mj-social>`;
    default:
      return "";
  }
}

function renderBlock(block: EmailBlock): string {
  if (block.type === "SECTION") {
    return `<mj-section background-color="${escapeHtml(
      block.backgroundColor,
    )}" padding="${block.padding}px"><mj-column>${block.blocks
      .map(renderLeafBlock)
      .join("")}</mj-column></mj-section>`;
  }
  return `<mj-section><mj-column>${renderLeafBlock(block)}</mj-column></mj-section>`;
}

export async function renderEmailTemplateToHtml(blocks: EmailBlock[]): Promise<string> {
  const mjmlMarkup = `<mjml><mj-body>${blocks.map(renderBlock).join("")}</mj-body></mjml>`;
  const result = await mjml2html(mjmlMarkup, { validationLevel: "soft" });
  return result.html;
}
