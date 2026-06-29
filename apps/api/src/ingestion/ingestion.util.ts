import { UAParser } from "ua-parser-js";

export interface ParsedUserAgent {
  device: string | null;
  os: string | null;
  browser: string | null;
}

export function parseUserAgent(userAgent: string | null | undefined): ParsedUserAgent {
  if (!userAgent) return { device: null, os: null, browser: null };
  const result = new UAParser(userAgent).getResult();
  const os = [result.os.name, result.os.version].filter(Boolean).join(" ").trim();
  const browser = [result.browser.name, result.browser.version].filter(Boolean).join(" ").trim();
  return {
    device: result.device.type ?? "desktop",
    os: os || null,
    browser: browser || null,
  };
}

/**
 * Trang HTML trả về khi request là native <form action> (không qua JS fetch) —
 * giữ đúng nội dung như HtmlService.createHtmlOutput trong google-apps-script.gs
 * gốc, vì target="_blank" của form sẽ mở thẳng response này trong tab mới.
 */
export function renderSubmitSuccessHtml(): string {
  return (
    '<div style="font-family:sans-serif;text-align:center;padding:60px 20px;max-width:480px;margin:0 auto;">' +
    '<h2 style="color:#155738;">\u{1F389} Chúc mừng bạn đã ứng tuyển thành công!</h2>' +
    "<p>Hiện tại số lượng ứng viên đang ứng tuyển cùng lúc khá đông, bạn vui lòng đợi vài phút, đội ngũ HR sẽ liên hệ cho bạn ngay nhé.</p>" +
    "<p>Hoặc bạn có thể kết bạn với HR công ty để được ưu tiên xếp lịch phỏng vấn sớm hơn nhé:</p>" +
    '<p><a href="https://zalo.me/0965133083" target="_blank" style="display:inline-block;background:#155738;color:#fff;text-decoration:none;font-weight:700;padding:14px 22px;border-radius:10px;margin-top:10px;">\u{1F4AC} Tôi muốn đặt lịch phỏng vấn sớm với HR</a></p>' +
    '<p style="margin-top:24px;color:#666;font-size:14px;">Bạn có thể đóng tab này.</p></div>'
  );
}

export function renderSubmitErrorHtml(message: string): string {
  return `<p style="font-family:sans-serif;padding:40px 20px;">Có lỗi: ${escapeHtml(message)}</p>`;
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
