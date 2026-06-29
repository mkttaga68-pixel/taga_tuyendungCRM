/**
 * Thay {{a.b.c}} bằng giá trị tại đường dẫn a.b.c trong data (dotted path).
 * Dùng cho Automation (Webhook body/Notification message...) — không phải
 * 1 template engine đầy đủ, chỉ thay thế biến đơn giản, đủ cho nhu cầu hiện tại.
 */
export function interpolateTemplate(template: string, data: Record<string, unknown>): string {
  return template.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_match, path: string) => {
    const value = path.split(".").reduce<unknown>((acc, key) => {
      if (acc === null || acc === undefined || typeof acc !== "object") return undefined;
      return (acc as Record<string, unknown>)[key];
    }, data);
    if (value === null || value === undefined) return "";
    if (typeof value === "object") return JSON.stringify(value);
    return String(value);
  });
}
