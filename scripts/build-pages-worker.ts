// Bundle du _worker.js Cloudflare Pages (passerelle push same-origin).
// Usage : bun scripts/build-pages-worker.ts   (après scripts/build-cloudflare.sh)
import { $ } from "bun";

const out = ".next-demo/_worker.js";
await $`bun build src/pages-worker.ts --outfile ${out} --format esm --target browser --minify`;
console.log(`✅ Worker Pages généré : ${out}`);
