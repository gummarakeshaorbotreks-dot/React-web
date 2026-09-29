// Runs after `vite build` (see package.json "build"):
//  1. renders the home page to HTML and puts it inside #root in dist/index.html,
//     so visitors see the page before the JavaScript has downloaded;
//  2. inlines the main stylesheet, so that first paint needs no extra request.
import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const DIST = process.env.PRERENDER_DIST || 'dist';
const SSR_ENTRY = 'node_modules/.cache/prerender/entry-prerender.js';

const { render } = await import(pathToFileURL(path.resolve(SSR_ENTRY)).href);
let html = await readFile(path.join(DIST, 'index.html'), 'utf8');

// 1. Pre-rendered home page, split into the page frame (header + empty
//    <main> + footer, used on every URL) and the home content, which
//    index.html only inserts on the home page.
const app = await render('/');
const mainMatch = app.match(/<main id="main">([\s\S]*)<\/main>/);
if (!mainMatch) throw new Error('Pre-rendered app has no <main id="main">');
const frame = app.replace(mainMatch[0], '<main id="main" data-prerendered=""></main>');
for (const placeholder of ['<!--prerender-->', '<!--prerender-home-->']) {
  if (!html.includes(placeholder)) throw new Error(`dist/index.html is missing the ${placeholder} placeholder`);
}
html = html.replace('<!--prerender-->', frame).replace('<!--prerender-home-->', mainMatch[1]);

// 2. Inline the entry stylesheet.
const cssLink = html.match(/<link rel="stylesheet" crossorigin href="(\/assets\/index-[^"]+\.css)">/);
if (!cssLink) throw new Error('Could not find the main stylesheet link in dist/index.html');
const css = await readFile(path.join(DIST, cssLink[1]), 'utf8');
html = html.replace(cssLink[0], `<style>${css}</style>`);

await writeFile(path.join(DIST, 'index.html'), html);
console.log(`prerender: frame ${(frame.length / 1024).toFixed(1)} KB + home ${(mainMatch[1].length / 1024).toFixed(1)} KB of HTML, ${(css.length / 1024).toFixed(1)} KB of CSS inlined`);
