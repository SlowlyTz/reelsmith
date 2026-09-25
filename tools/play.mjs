// Live preview in your browser: npm run play -- <slug> [--format 9:16]
import { serve, loadStory, args } from './lib/common.mjs';

const a = args(), slug = a._[0];
if (!slug) { console.error('usage: npm run play -- <slug> [--format 9:16]'); process.exit(1); }
loadStory(slug);
const srv = await serve(), q = new URLSearchParams({ story: slug }); if (a.format) q.set('format', a.format);
console.log(`open http://127.0.0.1:${srv.address().port}/engine/page.html?${q}   (add &t=12.5 for a still; Ctrl+C to stop)`);
