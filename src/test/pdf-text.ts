import { inflateSync } from "node:zlib";
import type { jsPDF } from "jspdf";

/**
 * Teks yang tercetak di PDF jsPDF (compress: true): tiap content stream
 * di-inflate, lalu string di dalam tanda kurung operator Tj/TJ dikumpulkan.
 * Cukup untuk menegaskan "label X ada / nama Y TIDAK ada" — bukan parser PDF.
 * Dipakai lintas berkas uji (pdf-exporters, nkt-report).
 */
export function pdfText(doc: jsPDF): string {
  const bytes = Buffer.from(doc.output("arraybuffer"));
  const out: string[] = [];
  let pos = 0;
  for (;;) {
    const start = bytes.indexOf("stream", pos, "latin1");
    if (start < 0) break;
    const bodyStart = bytes[start + 6] === 0x0d ? start + 8 : start + 7;
    const end = bytes.indexOf("endstream", bodyStart, "latin1");
    if (end < 0) break;
    const raw = bytes.subarray(bodyStart, end);
    let text: string;
    try {
      text = inflateSync(raw).toString("latin1");
    } catch {
      text = raw.toString("latin1");
    }
    for (const m of text.matchAll(/\(((?:\\.|[^\\)])*)\)\s*Tj/g)) out.push(m[1].replace(/\\([()\\])/g, "$1"));
    pos = end + 9;
  }
  return out.join("\n");
}
