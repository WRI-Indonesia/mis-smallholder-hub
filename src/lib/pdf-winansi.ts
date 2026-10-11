/**
 * Teks aman untuk font bawaan jsPDF (Helvetica/Times/Courier, encoding WinAnsi).
 *
 * Satu karakter di luar WinAnsi (mis. "≥") membuat jsPDF menulis SELURUH string
 * sebagai UTF-16 — di PDF tampil `Selisih Luas "e 0,50 Ha` (temuan #2 QA
 * v1.7.0, bug lama #305). Lint/test tak menangkapnya; layar tetap benar karena
 * browser punya glyph-nya. Maka teks layar dibiarkan, dan teks dipetakan di
 * titik render PDF saja.
 */
const REPLACEMENTS: Record<string, string> = {
  "≥": ">=",
  "≤": "<=",
  "≠": "!=",
  "≈": "~",
  "→": "->",
  "←": "<-",
  "✓": "v",
  "✗": "x",
  "−": "-",
  "\u202f": " ", // narrow no-break space (format angka Intl)
  "\u2009": " ", // thin space
};

/** Karakter cp1252 di 0x80–0x9F yang ada di WinAnsi (€ ‚ ƒ „ … † ‡ ˆ ‰ Š ‹ Œ Ž ‘ ’ “ ” • – — ˜ ™ š › œ ž Ÿ). */
const CP1252_EXTRA = new Set("€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ");

export function isWinAnsiChar(ch: string): boolean {
  const code = ch.codePointAt(0)!;
  return ch === "\n" || (code >= 0x20 && code <= 0x7e) || (code >= 0xa0 && code <= 0xff) || CP1252_EXTRA.has(ch);
}

/** Petakan simbol umum ke padanan ASCII; karakter lain di luar WinAnsi → "?" (bukan merusak seluruh baris). */
export function toWinAnsiText(text: string): string {
  let out = "";
  for (const ch of text) out += isWinAnsiChar(ch) ? ch : (REPLACEMENTS[ch] ?? "?");
  return out;
}
