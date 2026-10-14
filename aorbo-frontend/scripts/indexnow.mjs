// Tells Bing, Yandex, Naver, Seznam and Yep about our pages straight away (IndexNow),
// instead of waiting days for their crawlers. Google does not use IndexNow; it reads
// the sitemap through Search Console.
//
//   node scripts/indexnow.mjs                       every URL in the live sitemap
//   node scripts/indexnow.mjs /treks/Coorg /about   only these pages (after a change)
//
// Run it after a deploy, never before: the engines fetch the pages right away.
// The key file public/<KEY>.txt must be live at the site root; it proves we own the site.
const SITE = 'https://aorbotreks.com';
const KEY = '511c352aab48724bc430f6a5eb06073f';

const args = process.argv.slice(2);
let urls;
if (args.length) {
  urls = args.map((p) => (p.startsWith('http') ? p : `${SITE}${p.startsWith('/') ? '' : '/'}${p}`));
} else {
  const xml = await (await fetch(`${SITE}/sitemap.xml`)).text();
  urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
}
if (!urls.length) throw new Error('indexnow: no URLs to submit');

const keyFile = await fetch(`${SITE}/${KEY}.txt`);
if (!keyFile.ok || (await keyFile.text()).trim() !== KEY) {
  throw new Error(`indexnow: ${SITE}/${KEY}.txt is not live yet - deploy first`);
}

// One request takes up to 10,000 URLs.
for (let i = 0; i < urls.length; i += 10000) {
  const batch = urls.slice(i, i + 10000);
  const res = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ host: new URL(SITE).host, key: KEY, keyLocation: `${SITE}/${KEY}.txt`, urlList: batch }),
  });
  // 200 = accepted, 202 = accepted, key being checked; anything else is a problem.
  console.log(`indexnow: ${batch.length} URLs -> HTTP ${res.status} ${res.status === 200 || res.status === 202 ? 'accepted' : await res.text()}`);
  if (res.status !== 200 && res.status !== 202) process.exitCode = 1;
}
