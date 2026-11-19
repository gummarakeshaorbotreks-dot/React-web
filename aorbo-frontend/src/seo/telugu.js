// Telugu text for the Telugu trek guides (/te/treks/<key>, scripts/lang-pages.mjs), from the same checked
// facts as the English pages: fixed Telugu sentences with the facts filled in - no machine translation,
// and nothing said that the facts do not hold. Place names inside sentences stay as written in the facts
// (stations, villages); the trek's own name is in Telugu script (scripts/data/names-te.json) with the
// English name beside it. Plain JavaScript (app + build).

export const TE_MONTHS = ['జనవరి', 'ఫిబ్రవరి', 'మార్చి', 'ఏప్రిల్', 'మే', 'జూన్', 'జూలై', 'ఆగస్టు', 'సెప్టెంబర్', 'అక్టోబర్', 'నవంబర్', 'డిసెంబర్'];
export const TE_DIFFICULTY = {
  easy: 'సులభం', 'easy-moderate': 'సులభం నుండి మధ్యస్థం', moderate: 'మధ్యస్థం',
  'moderate-difficult': 'మధ్యస్థం నుండి కష్టం', difficult: 'కష్టం',
};
export const TE_STATES = {
  Karnataka: 'కర్ణాటక', Maharashtra: 'మహారాష్ట్ర', 'Himachal Pradesh': 'హిమాచల్ ప్రదేశ్', Uttarakhand: 'ఉత్తరాఖండ్',
  Kerala: 'కేరళ', 'Tamil Nadu': 'తమిళనాడు', 'Andhra Pradesh': 'ఆంధ్రప్రదేశ్', Telangana: 'తెలంగాణ', Goa: 'గోవా',
  'West Bengal': 'పశ్చిమ బెంగాల్', Sikkim: 'సిక్కిం', Rajasthan: 'రాజస్థాన్', 'Jammu and Kashmir': 'జమ్మూ కాశ్మీర్',
};
const num = (n) => Number(n).toLocaleString('en-IN');
const feet = (m) => Math.round((m * 3.28084) / 10) * 10;
export const teState = (s) => TE_STATES[s] || s;

/** [10, 11, 12, 1, 2] -> "అక్టోబర్ నుండి ఫిబ్రవరి వరకు"; separate runs joined with "మరియు". */
export function teMonthRange(months) {
  const set = new Set((months || []).filter((m) => m >= 1 && m <= 12));
  if (!set.size) return '';
  if (set.size === 12) return 'ఏడాది పొడవునా';
  const runs = [];
  for (let m = 1; m <= 12; m++) {
    const prev = m === 1 ? 12 : m - 1;
    if (!set.has(m) || set.has(prev)) continue;
    let end = m;
    while (set.has(end === 12 ? 1 : end + 1)) end = end === 12 ? 1 : end + 1;
    runs.push(end === m ? TE_MONTHS[m - 1] : `${TE_MONTHS[m - 1]} నుండి ${TE_MONTHS[end - 1]} వరకు`);
  }
  return runs.join(' మరియు ');
}

/** Facts box rows in Telugu (only the facts we have). */
export function teFactRows(f) {
  if (!f) return [];
  return [
    f.altitude_m && { label: 'ఎత్తు', value: `సుమారు ${num(f.altitude_m)} మీటర్లు (${num(feet(f.altitude_m))} అడుగులు)` },
    f.trail_km && { label: 'నడక దూరం', value: `సుమారు ${num(f.trail_km)} కి.మీ.` },
    f.difficulty && { label: 'కష్టం స్థాయి', value: TE_DIFFICULTY[f.difficulty] },
    f.months?.length && { label: 'సరైన సమయం', value: teMonthRange(f.months) },
    f.start && { label: 'మొదలయ్యే ప్రదేశం', value: f.start },
    f.district && { label: 'జిల్లా', value: f.district },
    f.rail && { label: 'దగ్గరి రైల్వే స్టేషన్', value: f.rail },
    f.airport && { label: 'దగ్గరి విమానాశ్రయం', value: f.airport },
  ].filter(Boolean);
}

/** The lead (and meta description), in a few sentences. */
export function teSummary(page) {
  const f = page.facts;
  const s = [];
  if (f.altitude_m) s.push(`${page.nameTe} ఎత్తు సుమారు ${num(f.altitude_m)} మీటర్లు.`);
  if (f.difficulty) s.push(`కష్టం స్థాయి: ${TE_DIFFICULTY[f.difficulty]}${f.trail_km ? `, నడక సుమారు ${num(f.trail_km)} కి.మీ.` : '.'}`);
  if (f.months?.length) s.push(`సరైన సమయం ${teMonthRange(f.months)}.`);
  if (f.start) s.push(`ట్రెక్ ${f.start} నుండి మొదలవుతుంది.`);
  if (page.price) s.push(`Aorbo Treksలో ప్యాకేజీలు ఒక్కొక్కరికి ₹${num(page.price)} నుండి.`);
  return s;
}

/** Questions the facts answer, in Telugu (page + FAQPage data). */
export function teFaqs(page) {
  const f = page.facts;
  const n = page.nameTe;
  const faqs = [];
  if (f.altitude_m) faqs.push({ q: `${n} ఎత్తు ఎంత?`, a: `సుమారు ${num(f.altitude_m)} మీటర్లు (${num(feet(f.altitude_m))} అడుగులు).` });
  if (f.difficulty) faqs.push({ q: `${n} ట్రెక్ కష్టమా?`, a: `${TE_DIFFICULTY[f.difficulty]}${f.trail_km ? `. నడక దూరం సుమారు ${num(f.trail_km)} కి.మీ.` : '.'}` });
  if (f.months?.length) faqs.push({ q: `${n} వెళ్ళడానికి సరైన సమయం ఏది?`, a: `${teMonthRange(f.months)}.` });
  const reach = [
    f.start && `ట్రెక్ ${f.start} నుండి మొదలవుతుంది.`,
    f.rail && `దగ్గరి రైల్వే స్టేషన్ ${f.rail}.`,
    f.airport && `దగ్గరి విమానాశ్రయం ${f.airport}.`,
  ].filter(Boolean);
  if (reach.length) faqs.push({ q: `${n} ఎలా చేరుకోవాలి?`, a: reach.join(' ') });
  faqs.push({
    q: `${n} ట్రెక్ ఎలా బుక్ చేయాలి?`,
    a: `క్రింద ఉన్న ప్యాకేజీల్లో ఒకటి ఎంచుకుని, తేదీ ఎంచుకుని Aorbo Treks వెబ్‌సైట్ లేదా యాప్‌లో బుక్ చేయండి.${page.price ? ` ధరలు ఒక్కొక్కరికి ₹${num(page.price)} నుండి.` : ''}`,
  });
  return faqs;
}
