// Math components for the Keystatic editor.
//
// The LaTeX is stored in a component ATTRIBUTE (<Equation tex="…" />), not in the
// rich-text body, so the editor can never escape `_`, `{`, `\` etc.
// Each component shows a live KaTeX preview inside the editor.
import * as React from 'react';
import katex from 'katex';
import { block, inline } from '@keystatic/core/content-components';
import { fields } from '@keystatic/core';
import { normaliseTex } from './tex-utils';

function Preview({ tex, display }: { tex: string; display: boolean }) {
  const html = React.useMemo(() => {
    if (!tex || !tex.trim()) return '';
    try {
      return katex.renderToString(normaliseTex(tex), {
        displayMode: display,
        throwOnError: false,
        strict: 'ignore',
      });
    } catch {
      return '';
    }
  }, [tex, display]);

  if (!html) {
    return (
      <span style={{ opacity: 0.55, fontStyle: 'italic' }}>
        {display ? 'Empty equation — type LaTeX in the field' : 'ƒ'}
      </span>
    );
  }
  return (
    <span
      style={display ? { display: 'block', overflowX: 'auto', textAlign: 'center' } : undefined}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

export const mathComponents = {
  Equation: block({
    label: 'Math Equation (LaTeX)',
    description:
      'A centered formula on its own line. Type plain LaTeX, e.g. FoS = \\frac{c\'}{\\tau}. No $ signs needed.',
    schema: {
      tex: fields.text({
        label: 'LaTeX',
        description: 'Plain LaTeX without $ / $$ delimiters. Example: \\frac{a}{b} + x_1',
        multiline: true,
        validation: { isRequired: true },
      }),
    },
    ContentView: ({ value }) => <Preview tex={value.tex} display />,
  }),

  InlineMath: inline({
    label: 'Inline Math (LaTeX)',
    description: 'A formula inside a sentence, e.g. P_f or \\tau_{mob}. No $ signs needed.',
    schema: {
      tex: fields.text({
        label: 'LaTeX',
        description: 'Plain LaTeX without $ delimiters. Example: \\phi\'',
        validation: { isRequired: true },
      }),
    },
    ContentView: ({ value }) => <Preview tex={value.tex} display={false} />,
  }),
};
