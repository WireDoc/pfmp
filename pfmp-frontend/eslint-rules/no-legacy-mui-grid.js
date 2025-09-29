/**
 * ESLint Rule: no-legacy-mui-grid
 * Forbids usage of legacy MUI Grid v1 patterns:
 *  - <Grid item ...>
 *  - Breakpoint props (xs|sm|md|lg|xl) directly on Grid elements
 *  - Import of Unstable_Grid2 / Grid2
 */

/** @type {import('eslint').Rule.RuleModule} */
export default {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow legacy MUI Grid v1 API usage in favor of Grid v2 size prop',
    },
    messages: {
      noItem: 'Use Grid v2: replace `item` + breakpoint props with `size={{ ... }}`.',
      noBreakpoint: 'Do not use `{{name}}` prop on Grid. Use size={{ { {{name}}: value } }} instead.',
      noLegacyImport: 'Do not import `Unstable_Grid2` / `Grid2`. Use `import { Grid } from "@mui/material"`.',
    },
    schema: [],
  },
  create(context) {
    return {
      ImportDeclaration(node) {
        if (node.source.value === '@mui/material/Unstable_Grid2') {
          context.report({ node, messageId: 'noLegacyImport' });
        }
      },
      JSXOpeningElement(node) {
        const name = node.name && node.name.name;
        if (name === 'Grid2') {
          context.report({ node, messageId: 'noLegacyImport' });
        }
        if (name === 'Grid') {
          const hasItem = node.attributes.some(a => a.type === 'JSXAttribute' && a.name && a.name.name === 'item');
          if (hasItem) {
            context.report({ node, messageId: 'noItem' });
          }
          const breakpointProps = ['xs', 'sm', 'md', 'lg', 'xl'];
          for (const bp of breakpointProps) {
            const attr = node.attributes.find(a => a.type === 'JSXAttribute' && a.name && a.name.name === bp);
            if (attr) {
              context.report({ node: attr, messageId: 'noBreakpoint', data: { name: bp } });
            }
          }
        }
      }
    };
  }
};
