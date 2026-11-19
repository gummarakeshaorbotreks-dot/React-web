// What each month is like for trekking, per region (SEO plan phase 2, 19 Nov 2026): the "Treks
// in <month>" pages list many of the same treks from October to February, so each page also says
// what that month brings - snow, rain, heat, closures. General seasonal facts only (when the
// monsoon arrives and leaves, when snow settles), no forecasts and no figures that change by year.
export const REGIONS = {
  himalaya: { name: 'Himalaya (Uttarakhand, Himachal, Darjeeling)', states: ['Uttarakhand', 'Himachal Pradesh', 'West Bengal', 'Sikkim', 'Jammu and Kashmir'] },
  sahyadri: { name: 'Sahyadris (Maharashtra and Goa)', states: ['Maharashtra', 'Goa'] },
  south: { name: 'Karnataka and the Western Ghats', states: ['Karnataka', 'Kerala', 'Tamil Nadu'] },
};

const NOTES = {
  himalaya: [
    'The coldest month. Deep snow on high trails like Kedarkantha and Dayara Bugyal, and nights well below freezing; heavy snowfall can close roads to the trailheads for a day or two.',
    'Still full winter: snow on trails above about 2,500 m and cold nights, with the days slowly getting longer.',
    'Snow starts to melt on the lower trails and rhododendrons begin to flower late in the month; it stays cold above 3,000 m.',
    'Spring: rhododendrons in flower on the lower slopes, snow left near the summits, and clear mornings.',
    'Pleasant days before the monsoon: a good month for high meadows and lakes. The Char Dham temples are open.',
    'Warm days early in the month; the monsoon reaches Uttarakhand and Himachal in the second half, and landslides can then block mountain roads.',
    'Monsoon: heavy rain and landslides on mountain roads. Most Himalayan treks pause.',
    'Monsoon continues: wet trails and landslides on the roads.',
    'The monsoon withdraws during the month and trails reopen, with green meadows.',
    'After the monsoon: clear skies and some of the best mountain views of the year, with cold nights.',
    'Clear and cold. The first snow falls on the high peaks, and the Char Dham temples close for winter.',
    'Winter begins: snow usually settles on trails like Kedarkantha from the middle to the end of the month.',
  ],
  sahyadri: [
    'Cool, dry and clear: good for long fort treks and night treks. The hills have turned brown.',
    'Dry with pleasant mornings; it starts to warm up by the end of the month.',
    'Hot afternoons begin: start early and carry plenty of water.',
    'Hot. Trek at night or very early; there is little water on the trails.',
    'The hottest month before the rain. Fireflies appear in some forests, like Rajmachi and Bhandardara, from late May into early June.',
    'The monsoon arrives in the first half of the month: waterfalls start and trails turn slippery.',
    'Peak monsoon: the heaviest rain, waterfalls in full flow and mist on the ridges. Some waterfalls and forts are closed to visitors during heavy rain.',
    'The monsoon continues: green hills and full waterfalls; rock patches stay slippery.',
    'The rain eases, the hills stay green, and flowers come up on the plateaus.',
    'After the monsoon: green hills with drier trails, though afternoons can be hot.',
    'Cool and clear: good for long fort treks and camping.',
    'Cool nights and clear skies: a good month for night treks and camping.',
  ],
  south: [
    'Cool and dry: clear sunrises on the hills around Bangalore, and morning mist in the Western Ghats.',
    'Dry and pleasant: the last cool month before summer.',
    'Warming up: the rocky hills near Bangalore get hot by mid-morning, and the Western Ghats forests turn dry.',
    'Hot: trek early in the morning. Some forest trails can close in the fire season.',
    'Hot, with thunderstorms on some afternoons before the monsoon.',
    'The southwest monsoon reaches the Western Ghats early in the month, with heavy rain on the coast and the ghats.',
    'The heaviest rain in the Western Ghats: some forest treks close, and there are leeches on the trails.',
    'The monsoon continues: waterfalls in full flow; the trails near Bangalore are green but slippery.',
    'The rain eases near Bangalore and the hills turn green; the Western Ghats stay wet.',
    'After the monsoon: green hills and flowing waterfalls, and the Western Ghats treks begin to reopen.',
    'Cool and green, with some showers from the northeast monsoon.',
    'Cool mornings and mist: one of the best months for sunrise treks.',
  ],
};

export const regionOf = (state) => Object.keys(REGIONS).find((r) => REGIONS[r].states.includes(state)) || null;

/** [{ region, name, note }] for a month, for the regions that have treks on the page. */
export function monthNotes(month, states) {
  const regions = [...new Set((states || []).map(regionOf).filter(Boolean))];
  return Object.keys(REGIONS).filter((r) => regions.includes(r)).map((r) => ({ region: r, name: REGIONS[r].name, note: NOTES[r][month - 1] }));
}
