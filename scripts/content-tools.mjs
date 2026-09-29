#!/usr/bin/env node
// Content health tool for src/content/**/*.{md,mdx}
//
//   node scripts/content-tools.mjs check            report problems (exit 0; use --strict to fail)
//   node scripts/content-tools.mjs fix              repair problems in place
//   node scripts/content-tools.mjs fix --components also convert $…$ / $$…$$ to the panel-safe
//                                                   <InlineMath/> / <Equation/> components
//
// Wired into `npm run build` (prebuild → check) and the GitHub Actions deploy, where each
// finding becomes a visible annotation. Keystatic saves can never silently break the site
// unnoticed again.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { repairTex } from '../src/plugins/math-repair.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTENT_DIR = path.join(ROOT, 'src', 'content');

const [, , mode = 'check', ...flags] = process.argv;
const STRICT = flags.includes('--strict');
const TO_COMPONENTS = flags.includes('--components');
const IN_ACTIONS = process.env.GITHUB_ACTIONS === 'true';

/* ── helpers ───────────────────────────────────────────────── */

function* walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else if (/\.mdx?$/.test(entry.name)) yield full;
  }
}

/** Split text into alternating [prose, fence, prose, fence…] so code is never touched. */
function splitFences(body) {
  const lines = body.split('\n');
  const parts = [];
  let buf = [];
  let inFence = false;
  let marker = '';
  const flush = (isFence) => {
    if (buf.length) parts.push({ fence: isFence, text: buf.join('\n') });
    buf = [];
  };
  for (const line of lines) {
    const m = line.match(/^\s*(`{3,}|~{3,})/);
    if (!inFence && m) {
      flush(false);
      inFence = true;
      marker = m[1][0];
      buf.push(line);
    } else if (inFence && m && m[1][0] === marker && /^\s*[`~]{3,}\s*$/.test(line)) {
      buf.push(line);
      flush(true);
      inFence = false;
    } else {
      buf.push(line);
    }
  }
  flush(inFence);
  return parts;
}

const attr = (tex) => tex.trim().replace(/&/g, '&amp;').replace(/"/g, '&quot;');

/* ── per-file processing ───────────────────────────────────── */

function processFile(raw, file) {
  const issues = [];
  const note = (msg, level = 'warning') => issues.push({ level, msg });
  const isMdx = file.endsWith('.mdx');

  let fm = '';
  let body = raw.replace(/\r\n/g, '\n');
  const fmMatch = body.match(/^---\n([\s\S]*?)\n---\n?/);
  if (fmMatch) {
    fm = fmMatch[0];
    body = body.slice(fm.length);
  }

  /* frontmatter: "# " prefix in title / description */
  let newFm = fm;
  newFm = newFm.replace(/^(title:\s*['"]?)\s*#+\s+/m, (_, a) => (note('title starts with "#"'), a));
  newFm = newFm.replace(/^(description:\s*[>|]-?\s*\n\s+)#+\s+/m, (_, a) => (note('description starts with "#"'), a));
  newFm = newFm.replace(/^(description:\s*['"]?)\s*#+\s+/m, (_, a) => (note('description starts with "#"'), a));

  /* lone backslash lines (fake hard breaks left by the editor) */
  if (/^[ \t]*\\[ \t]*$/m.test(body)) {
    note('lone "\\" lines (fake line breaks) found');
    body = body.replace(/^[ \t]*\\[ \t]*\n/gm, '');
  }

  /* leading H1 duplicates the page title */
  const h1 = body.match(/^\s*# [^\n]*\n/);
  if (h1) {
    note('body starts with an H1 (the title is already printed as <h1>)');
    body = body.slice(h1[0].length);
  }

  const parts = splitFences(body).map((part) => {
    let source = part.text;
    if (part.fence) {
      // fenced "prose" carrying \( … \) math → turn into normal text so it becomes real math
      const fenceBody = part.text.replace(/^\s*(`{3,}|~{3,})\s*\n/, '').replace(/\n?\s*(`{3,}|~{3,})\s*$/, '');
      const openLine = part.text.split('\n')[0];
      if (/^\s*(`{3,}|~{3,})\s*$/.test(openLine) && /\\\(.+?\\\)/.test(fenceBody)) {
        note('math is wrapped in a code fence with \\( … \\) — converting to inline math');
        source = fenceBody.replace(/\\\((.+?)\\\)/g, (_, t) => `$${t.trim()}$`);
        // fall through: the converted text goes through the normal prose pipeline below
      } else {
        return part; // real code — never touched
      }
    }

    let t = source;

    // MDX: <br> must be self-closed or the page fails to compile
    if (isMdx && /<(br|hr)\s*>/i.test(t)) {
      note('<br>/<hr> is not self-closed (MDX requires <br />)', 'error');
      t = t.replace(/<(br|hr)\s*>/gi, '<$1 />');
    }

    // display math $$ … $$
    t = t.replace(/\$\$([\s\S]+?)\$\$/g, (whole, tex, offset, all) => {
      const fixed = repairTex(tex);
      if (fixed !== tex) note('escaped LaTeX (\\_ \\{ …) inside $$…$$ repaired');
      if (!TO_COMPONENTS) return `$$${fixed}$$`;
      const before = all.slice(all.lastIndexOf('\n', offset - 1) + 1, offset);
      const afterEnd = all.indexOf('\n', offset + whole.length);
      const after = all.slice(offset + whole.length, afterEnd === -1 ? undefined : afterEnd);
      const alone = before.trim() === '' && after.trim() === '';
      const cleaned = fixed.replace(/\n\s*/g, ' ');
      return alone
        ? `<Equation tex="${attr(cleaned)}" />`
        : `<InlineMath tex="${attr(cleaned)}" />`;
    });

    // inline math $ … $   (skip currency like "$5 to $10")
    t = t.replace(/(?<![\\$\w])\$(?![\s$])([^$\n]+?)(?<![\s\\])\$(?![\d$])/g, (whole, tex) => {
      const fixed = repairTex(tex);
      if (fixed !== tex) note('escaped LaTeX (\\_ \\{ …) inside $…$ repaired');
      return TO_COMPONENTS ? `<InlineMath tex="${attr(fixed)}" />` : `$${fixed}$`;
    });

    // markdown tables broken by multi-line cells / escaped pipes
    if (/^\\\|/m.test(t)) note('table row starts with an escaped pipe "\\|" — table is broken; rebuild it with one line per row');

    // \( … \) / \[ … \] outside code is silently dropped by Markdown
    if (/\\\(.+?\\\)|\\\[.+?\\\]/.test(t)) note('\\( … \\) / \\[ … \\] math is not supported — use $…$ or the Math components');

    if (!TO_COMPONENTS && /(?<![\\$\w])\$(?![\s$])[^$\n]+?(?<![\s\\])\$(?![\d$])|\$\$/.test(t) && isMdx) {
      note('raw $-math in an .mdx file: it renders fine, but saving this entry in the Keystatic panel would escape it. Run `npm run fix:content -- --components` to make it panel-safe.', 'notice');
    }
    return { fence: false, text: t };
  });

  let out = newFm + parts.map((p) => p.text).join('\n');
  out = out.replace(/\n{3,}/g, '\n\n');
  if (!out.endsWith('\n')) out += '\n';
  // Healthy file → return it byte-for-byte untouched.
  if (!issues.length && !TO_COMPONENTS) out = raw.replace(/\r\n/g, '\n');
  return { out, issues };
}

/* ── main ──────────────────────────────────────────────────── */

let problems = 0;
let changedFiles = 0;

for (const file of walk(CONTENT_DIR)) {
  const rel = path.relative(ROOT, file).replaceAll('\\', '/');
  const raw = fs.readFileSync(file, 'utf8');
  const { out, issues } = processFile(raw, file);
  const unique = [...new Map(issues.map((i) => [i.msg, i])).values()];

  if (mode === 'fix') {
    if (out !== raw.replace(/\r\n/g, '\n')) {
      fs.writeFileSync(file, out, 'utf8');
      changedFiles += 1;
      console.log(`fixed   ${rel}${unique.length ? `  (${unique.map((i) => i.msg).join('; ')})` : ''}`);
    }
    continue;
  }

  for (const i of unique) {
    if (i.level !== 'notice') problems += 1;
    if (IN_ACTIONS) {
      const cmd = i.level === 'error' ? 'error' : i.level === 'notice' ? 'notice' : 'warning';
      console.log(`::${cmd} file=${rel}::${i.msg}`);
    } else {
      console.log(`${i.level === 'error' ? '✖' : i.level === 'notice' ? 'ℹ' : '⚠'} ${rel}: ${i.msg}`);
    }
  }
}

if (mode === 'fix') {
  console.log(changedFiles ? `\nDone — ${changedFiles} file(s) repaired.` : 'Nothing to fix.');
} else if (problems) {
  console.log(`\n${problems} content problem(s) found. Most are auto-repaired at build time; run \`npm run fix:content\` to clean the files.`);
  if (STRICT) process.exit(1);
} else {
  console.log('✓ content looks healthy');
}
