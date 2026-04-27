import type { Contact } from "@workspace/db";

export function renderTemplate(
  template: string,
  contact: Contact,
): string {
  const baseVars: Record<string, string> = {
    name: contact.name ?? "",
    email: contact.email ?? "",
    phone: contact.phone ?? "",
  };

  let extra: Record<string, unknown> = {};
  if (contact.extraJson) {
    try {
      const parsed = JSON.parse(contact.extraJson) as unknown;
      if (parsed && typeof parsed === "object") {
        extra = parsed as Record<string, unknown>;
      }
    } catch {
      // ignore malformed extra JSON
    }
  }

  return template.replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (_, raw: string) => {
    const key = raw.trim();
    if (key in baseVars) return baseVars[key] ?? "";
    const v = extra[key];
    if (v == null) return "";
    return String(v);
  });
}
