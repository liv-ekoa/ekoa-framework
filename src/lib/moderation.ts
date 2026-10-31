// Content safety for everything students write or upload in shared spaces.
//
// The same word lists run in two places: here, so the person posting gets an answer at once, and
// in the database (public.moderation_hit, generated from this file by `npm run moderation:sql`), so
// nothing gets past by skipping the app. Anything caught is hidden immediately and goes to the
// author's teacher and the Ekoa admins, who can restore it if the filter got it wrong.

export type FlagReason = 'self_harm' | 'violence' | 'hate' | 'sexual' | 'bullying' | 'contact' | 'other';

export const FLAG_REASONS: Record<FlagReason, { label: string; report: string; author: string }> = {
  self_harm: {
    label: 'Self-harm or someone at risk',
    report: 'Someone may be at risk of hurting themselves',
    author: 'Your post is hidden while a teacher looks at it. If you are going through something hard, please talk to a teacher, a parent or someone you trust today. You are not in trouble.',
  },
  violence: { label: 'Violence or threats', report: 'Violence or threats', author: 'Your post was removed because it looked like it contained violence or a threat. Your teacher will review it.' },
  hate: { label: 'Hate or slurs', report: 'Hate, slurs or discrimination', author: 'Your post was removed because it looked like it contained hateful language. Your teacher will review it.' },
  sexual: { label: 'Nudity or sexual content', report: 'Nudity or sexual content', author: 'Your post was removed because it looked like it contained sexual content. Your teacher will review it.' },
  bullying: { label: 'Bullying or abusive language', report: 'Bullying, insults or abusive language', author: 'Your post was removed because it looked like bullying or abusive language. Your teacher will review it.' },
  contact: { label: 'Contact details', report: 'Someone shared or asked for contact details', author: 'Your post is held because it looked like it contained contact details (a phone number, email or social handle). Your teacher will review it.' },
  other: { label: 'Something else', report: 'Something else that should not be here', author: 'Your post is hidden while your teacher reviews it.' },
};

/** Phrases per category, checked in this order. Each entry is a regular-expression fragment that
 *  must match whole words. Text is lower-cased, common look-alike characters are mapped back to
 *  letters (0→o, 1→i, 3→e, 4→a, 5→s, 7→t, @→a, $→s) and runs of 3+ repeated letters are shortened. */
export const PATTERNS: [Exclude<FlagReason, 'contact' | 'other'>, string[]][] = [
  ['self_harm', [
    'kill(ing)? myself', 'end(ing)? my life', 'end it all', 'want(ed)? to die', 'wanna die', 'suicid(e|al)', 'self[ -]?harm(ing)?',
    'cut(ting)? myself', 'hurt(ing)? myself', 'kms', 'no reason to live', 'better off dead',
  ]],
  ['violence', [
    "(i'?ll|i will|i'?m gonna|im gonna|i am going to|gonna) (kill|hurt|beat|stab|shoot|punch|attack|murder) (you|u|him|her|them|everyone|you all)",
    '(bring|bringing) an? (gun|knife|weapon) to school', '(shoot|bomb|blow) up (the|this|our|your) school',
    "(you'?re|you are|ur) dead", 'watch your back', "i'?ll find (you|u)",
  ]],
  ['hate', [
    'niggas?', 'niggers?', 'fags?', 'faggots?', 'chinks?', 'pakis?', 'kikes?', 'spics?', 'trann(y|ies)', 'towelheads?', 'ragheads?',
    'go back to your (own )?country',
  ]],
  ['sexual', [
    'porn(o|ography)?', 'nudes?', 'naked', 'sex', 'sexy', 'sexting', 'horny', 'boobs', 'tits', 'dick', 'penis', 'vagina', 'pussy',
    'blow ?job', 'onlyfans', 'send (me )?(pics|nudes|photos of you)', 'hot pics', 'kontol', 'memek', 'ngentot', 'chudai',
  ]],
  ['bullying', [
    'kill yourself', 'kys', 'go die', '(nobody|no one) likes you', 'every(one|body) hates you',
    "(you'?re|you are|ur|u r|youre|you guys are|you all are) (all |all such |so |such an? |an? |the |a bunch of )?(stupid|idiots?|dumb|ugly|fat|losers?|worthless|pathetic|disgusting|useless|morons?|freaks?|failures?)",
    'idiots?', 'morons?', 'losers?', 'retard(s|ed)?', 'dumbass(es)?', 'jackass(es)?',
    'fuck(ing|er|ed)?', 'motherfucker', 'shit', 'bullshit', 'bitch(es)?', 'bastard', 'asshole', 'dickhead', 'cunt', 'wanker', 'twat', 'slut', 'whore',
    'chutiy(a|e)', 'madarchod', 'b(h)?enchod', 'bhosdike', 'gaa?ndu', 'randi', 'harami', 'kamina', 'bangsat', 'bajingan', 'goblok', 'tolol',
  ]],
];

const LOOKALIKES: Record<string, string> = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '@': 'a', $: 's' };
export const normalise = (text: string) =>
  text.toLowerCase().replace(/[013457@$]/g, (c) => LOOKALIKES[c]).replace(/(.)\1{2,}/g, '$1');

const COMPILED = PATTERNS.map(([reason, list]) => [reason, new RegExp(`\\b(${list.join('|')})\\b`)] as const);

/** Contact details are checked on the original text, before look-alike letters are mapped. */
const CONTACT: [RegExp, string][] = [
  [/(\+?\d[\d\s-]{7,}\d)/, 'phone number'],
  [/\d{2,}x{2,}\d{2,}/i, 'phone number'],
  [/[\w.+-]+@[\w-]+\.[\w.]+/, 'email address'],
  [/\b(whatsapp|insta(gram)?|snap(chat)?|telegram|discord|dm me|message me privately)\b/i, 'off-platform contact'],
  [/(^|\s)@[a-z0-9_.]{3,}/i, 'social handle'],
];

/** What, if anything, the filter would stop. The most serious category wins. */
export function screen(text: string): { reason: FlagReason; detail: string } | null {
  const t = normalise(text);
  for (const [reason, re] of COMPILED) if (re.test(t)) return { reason, detail: FLAG_REASONS[reason].label.toLowerCase() };
  for (const [re, label] of CONTACT) if (re.test(text)) return { reason: 'contact', detail: label };
  return null;
}

/** Postgres version of the same check, for the generator script. */
export function moderationSql(): string {
  const q = (s: string) => s.replace(/'/g, "''");
  const branches = PATTERNS.map(([reason, list]) => `  if t ~ '\\m(${q(list.join('|'))})\\M' then return '${reason}'; end if;`).join('\n');
  return `create or replace function public.moderation_hit(p_text text) returns text
language plpgsql immutable set search_path = public as $$
-- Generated from src/lib/moderation.ts by \`npm run moderation:sql\`. Edit the TypeScript, not this.
declare t text := regexp_replace(translate(lower(coalesce(p_text, '')), '013457@$', 'oieastas'), '(.)\\1{2,}', '\\1', 'g');
begin
${branches}
  if p_text ~ '(\\+?\\d[\\d\\s-]{7,}\\d)' or p_text ~* '\\d{2,}x{2,}\\d{2,}' or p_text ~ '[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+\\.[A-Za-z.]+'
     or p_text ~* '\\m(whatsapp|insta|instagram|snap|snapchat|telegram|discord|dm me|message me privately)\\M' or p_text ~* '(^|\\s)@[a-z0-9_.]{3,}' then
    return 'contact';
  end if;
  return null;
end $$;`;
}

/** Nudity check for photos, run in the browser before upload with the open-source NSFWJS model.
 *  Loaded only when someone picks a photo. Returns the reason to block, or null if the photo is fine. */
export async function screenImage(file: Blob): Promise<'sexual' | null> {
  if (!file.type.startsWith('image/')) return null;
  const [{ load }, { MobileNetV2Model }] = await Promise.all([import('nsfwjs/core'), import('nsfwjs/models/mobilenet_v2')]);
  await import('@tensorflow/tfjs');
  const model = await load('MobileNetV2', { modelDefinitions: [MobileNetV2Model] });
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement('canvas');
  const scale = Math.min(1, 512 / Math.max(bitmap.width, bitmap.height));
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const scores = Object.fromEntries((await model.classify(canvas)).map((p) => [p.className, p.probability]));
  // Stricter than the library's examples: this is a platform for school students.
  const explicit = (scores.Porn ?? 0) + (scores.Hentai ?? 0);
  return explicit >= 0.35 || (scores.Sexy ?? 0) >= 0.6 ? 'sexual' : null;
}
