// Helpers that repair LaTeX which was mangled by a Markdown/MDX editor.
//
// Why this exists
// ---------------
// Keystatic's rich-text MDX editor knows nothing about math. When a formula such as
//     $\frac{a}{b} + x_1$
// is typed or pasted into it, the editor "protects" characters that are special in
// MDX and saves
//     $\frac\{a}\{b} + x\_1$
// In LaTeX `\_` prints a literal underscore (no subscript) and `\{` prints a literal
// brace (so \frac loses its arguments) — the formula renders as garbage.
//
// `repairTex` reverses exactly those editor-made escapes and leaves intentional
// LaTeX escapes (e.g. `\{ x \mid x>0 \}` or `\text{a\_b}`) alone.

/** Commands whose braced argument is typeset in text mode (where `\_` is legitimate). */
const TEXT_COMMANDS = new Set(['text', 'textrm', 'textbf', 'textit', 'textsf', 'texttt', 'mbox']);

/** Characters that are never valid after a backslash in KaTeX but that editors escape. */
const EDITOR_ONLY_ESCAPES = new Set(['[', ']', '<', '>', '*']);

/**
 * @param {string} source raw LaTeX (without $ delimiters)
 * @returns {string} repaired LaTeX
 */
export function repairTex(source) {
  if (typeof source !== 'string' || source.indexOf('\\') === -1) return source;

  // `\\\_` = editor doubled the backslash of `\_`  →  `\_`
  const s = source.replace(/\\\\\\_/g, '\\_');

  // ── 1) tokenise ────────────────────────────────────────────
  /** @type {{k:'cmd'|'esc'|'ch', v:string, ch?:string, name?:string, fix?:boolean}[]} */
  const toks = [];
  for (let i = 0; i < s.length; ) {
    const c = s[i];
    if (c !== '\\') {
      toks.push({ k: 'ch', v: c, ch: c });
      i += 1;
      continue;
    }
    const n = s[i + 1];
    if (n === undefined) {
      toks.push({ k: 'ch', v: c, ch: c });
      i += 1;
    } else if (/[A-Za-z]/.test(n)) {
      let j = i + 1;
      while (j < s.length && /[A-Za-z]/.test(s[j])) j += 1;
      toks.push({ k: 'cmd', v: s.slice(i, j), name: s.slice(i + 1, j) });
      i = j;
    } else {
      toks.push({ k: 'esc', v: s.slice(i, i + 2), ch: n });
      i += 2;
    }
  }

  // ── 2) decide which escapes are editor damage ──────────────
  /** @type {{tok: typeof toks[number], esc: boolean, text: boolean}[]} */
  const stack = [];
  let pendingText = false;

  for (const t of toks) {
    if (t.k === 'cmd') {
      pendingText = TEXT_COMMANDS.has(/** @type {string} */ (t.name));
      continue;
    }

    const isOpen = t.ch === '{' && (t.k === 'ch' || t.k === 'esc');
    const isClose = t.ch === '}' && (t.k === 'ch' || t.k === 'esc');
    const parentText = stack.length > 0 && stack[stack.length - 1].text;

    if (isOpen) {
      stack.push({ tok: t, esc: t.k === 'esc', text: pendingText || parentText });
    } else if (isClose && t.k === 'ch') {
      // A plain `}` closing a `\{` means the `\{` was an editor escape.
      const top = stack.pop();
      if (top && top.esc) top.tok.fix = true;
    } else if (isClose && t.k === 'esc') {
      // `\}` legitimately closes a `\{` (literal braces); otherwise leave it.
      const top = stack[stack.length - 1];
      if (top && top.esc) stack.pop();
    } else if (t.k === 'esc' && t.ch === '_') {
      const inText = stack.some((e) => e.text);
      if (!inText) t.fix = true;
    } else if (t.k === 'esc' && EDITOR_ONLY_ESCAPES.has(/** @type {string} */ (t.ch))) {
      t.fix = true;
    }
    pendingText = false;
  }

  // ── 3) rebuild ─────────────────────────────────────────────
  return toks.map((t) => (t.fix ? /** @type {string} */ (t.ch) : t.v)).join('');
}

/** Remove a wrapping `$…$` / `$$…$$` if someone pasted delimiters into a math field. */
export function stripMathDelimiters(tex) {
  const t = String(tex ?? '').trim();
  const m = t.match(/^\$\$([\s\S]*)\$\$$/) || t.match(/^\$([\s\S]*)\$$/);
  return m ? m[1].trim() : t;
}

/** Everything the Equation / InlineMath components do to their input before KaTeX sees it. */
export function normaliseTex(tex) {
  return repairTex(stripMathDelimiters(tex));
}
