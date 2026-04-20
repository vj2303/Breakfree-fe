/**
 * Convert TipTap / HTML fragments to plain text for jsPDF (splitTextToSize).
 */
export function htmlToPlainTextForPdf(html: string): string {
  if (!html || typeof html !== "string") return "";
  const trimmed = html.trim();
  if (!trimmed.includes("<")) return html;

  if (typeof document !== "undefined") {
    const d = document.createElement("div");
    d.innerHTML = html;
    return (d.innerText || d.textContent || "")
      .replace(/\u00a0/g, " ")
      .replace(/\n{3,}/g, "\n\n");
  }

  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
