// Turning a pasted policy document into sections.

/** Splits a pasted policy into sections. A heading is a short line that does not end like a
 *  sentence (or starts with a number or #), followed by its text. */
export function splitPolicy(text: string): { title: string; body: string }[] {
  const lines = text.replace(/\r/g, '').split('\n').map((l) => l.trim());
  const isHeading = (l: string, next: string | undefined) =>
    !!l && !!next && l.length <= 90 && (/^(#+\s|\d+(\.\d+)*[.)]?\s|section\s+\d|part\s+\d)/i.test(l) || (!/[.,;:]$/.test(l) && l.split(' ').length <= 10));
  const out: { title: string; body: string }[] = [];
  let cur: { title: string; body: string[] } | null = null;
  lines.forEach((l, i) => {
    const next = lines.slice(i + 1).find(Boolean);
    if (isHeading(l, next)) {
      // Two headings in a row: the first was the document's own title, so the second replaces it.
      if (cur && cur.body.length) out.push({ title: cur.title, body: cur.body.join('\n').trim() });
      cur = { title: l.replace(/^#+\s*/, '').replace(/[:]$/, ''), body: [] };
    } else if (l || cur?.body.length) {
      if (!cur) cur = { title: 'Introduction', body: [] };
      cur.body.push(l);
    }
  });
  if (cur) out.push({ title: (cur as { title: string }).title, body: (cur as { body: string[] }).body.join('\n').trim() });
  return out.filter((s) => s.title || s.body).map((s) => ({ ...s, body: s.body.replace(/\n{3,}/g, '\n\n') }));
}
