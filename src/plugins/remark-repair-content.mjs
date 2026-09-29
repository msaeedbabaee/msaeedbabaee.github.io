// Build-time safety net for content written in (or pasted into) the Keystatic panel.
// Runs AFTER remark-math and fixes the well-known damage a rich-text editor does:
//
//   1. Escaped LaTeX inside $…$ / $$…$$        (\_  \{  \[  \<  …)          → repairTex()
//   2. Prose wrapped in a ``` fence containing \( … \) "math"              → real inline math
//   3. Paragraphs that contain only a lone `\` (fake hard line breaks)     → removed
//   4. A leading `# H1` in the body (the page template already prints the
//      title as <h1>) is dropped; any other H1 is demoted to H2.
//
// The authoritative fix is to write math with the <Equation /> and <InlineMath />
// components (see AUTHORING.md); this plugin only rescues legacy / pasted content.
import { visit, SKIP } from 'unist-util-visit';
import { repairTex } from './math-repair.mjs';

const SKIPPABLE_LEADING = new Set(['yaml', 'toml', 'mdxjsEsm']);

/** Build an mdast inlineMath node that rehype-katex understands. */
function inlineMath(value) {
  return {
    type: 'inlineMath',
    value,
    data: {
      hName: 'code',
      hProperties: { className: ['language-math', 'math-inline'] },
      hChildren: [{ type: 'text', value }],
    },
  };
}

/** Split "Where \(c'\) is …" into text + inlineMath nodes. */
function splitParenMath(text) {
  const nodes = [];
  const re = /\\\((.+?)\\\)/g;
  let last = 0;
  let m;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) nodes.push({ type: 'text', value: text.slice(last, m.index) });
    nodes.push(inlineMath(repairTex(m[1].trim())));
    last = m.index + m[0].length;
  }
  if (last < text.length) nodes.push({ type: 'text', value: text.slice(last) });
  return nodes;
}

/** Build an mdast display-math node that rehype-katex understands. */
function displayMath(value) {
  return {
    type: 'math',
    value,
    meta: null,
    data: {
      hName: 'pre',
      hChildren: [
        {
          type: 'element',
          tagName: 'code',
          properties: { className: ['language-math', 'math-display'] },
          children: [{ type: 'text', value }],
        },
      ],
    },
  };
}

export default function remarkRepairContent() {
  return (tree, file) => {
    // 1) repair escaped LaTeX
    visit(tree, ['math', 'inlineMath'], (node) => {
      const fixed = repairTex(node.value);
      if (fixed === node.value) return;
      node.value = fixed;
      const child = node.data?.hChildren?.[0];
      if (child && child.type === 'text') child.value = fixed;
    });

    // 2) ``` fenced prose that actually holds \( … \) math
    visit(tree, 'code', (node, index, parent) => {
      if (!parent || index === undefined || node.lang) return;
      if (!/\\\(.+?\\\)/.test(node.value)) return;
      const children = splitParenMath(node.value.trim());
      parent.children.splice(index, 1, { type: 'paragraph', children });
      return [SKIP, index + 1];
    });

    // 3) paragraphs consisting only of `\` / hard breaks
    visit(tree, 'paragraph', (node, index, parent) => {
      if (!parent || index === undefined) return;
      const onlyBackslash =
        node.children.length > 0 &&
        node.children.every(
          (c) => c.type === 'break' || (c.type === 'text' && /^[\s\\]*$/.test(c.value))
        );
      if (onlyBackslash) {
        parent.children.splice(index, 1);
        return [SKIP, index];
      }
    });

    // 4) lone `$$ … $$` paragraph → display equation
    const source = typeof file?.value === 'string' ? file.value : '';
    visit(tree, 'paragraph', (node, index, parent) => {
      if (!parent || index === undefined || node.children.length !== 1) return;
      const only = node.children[0];
      if (only.type !== 'inlineMath') return;
      const start = only.position?.start?.offset;
      if (start === undefined || source.slice(start, start + 2) !== '$$') return;
      parent.children[index] = displayMath(only.value);
    });

    // 5) H1 handling (title is rendered by the page template)
    let first = true;
    for (let i = 0; i < tree.children.length; i += 1) {
      const node = tree.children[i];
      if (SKIPPABLE_LEADING.has(node.type)) continue;
      if (first && node.type === 'heading' && node.depth === 1) {
        tree.children.splice(i, 1);
        i -= 1;
      }
      first = false;
    }
    visit(tree, 'heading', (node) => {
      if (node.depth === 1) node.depth = 2;
    });
  };
}
