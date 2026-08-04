/**
 * renderEmail.mjs — Renders a React email component to an HTML string.
 *
 * Usage: node scripts/renderEmail.mjs <ComponentName> "<JSON props>"
 *
 * Strategy:
 *   1. Read the .jsx component source
 *   2. Transpile JSX -> React.createElement with esbuild.transform
 *   3. Rewrite imports/exports for CJS compatibility
 *   4. Write to temp .cjs file
 *   5. require() the temp file
 *   6. Render with ReactDOMServer.renderToString()
 */

import fs from 'fs';
import { createRequire } from 'module';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const srcEmailsDir = path.resolve(__dirname, '../src/emails');
const frontendDir = path.resolve(__dirname, '..');

const componentName = process.argv[2];
const propsJson = process.argv[3] || '{}';

if (!componentName) {
  console.error('Usage: node renderEmail.mjs <ComponentName> "<JSON props>"');
  process.exit(1);
}

let props;
try {
  props = JSON.parse(propsJson);
} catch {
  console.error('Invalid JSON props:', propsJson);
  process.exit(1);
}

const componentPath = path.join(srcEmailsDir, `${componentName}.jsx`);

if (!fs.existsSync(componentPath)) {
  console.error(`Component not found: ${componentPath}`);
  process.exit(1);
}

async function main() {
  let esbuild;
  try {
    esbuild = await import('esbuild');
  } catch {
    console.error('esbuild is required. Install it: npm install --save-dev esbuild');
    process.exit(1);
  }

  const sourceCode = fs.readFileSync(componentPath, 'utf8');

  // Step 1: Strip ESM imports — we'll provide React via require()
  // Remove "import React from 'react'" lines
  let cleaned = sourceCode.replace(
    /^import\s+React\s+from\s+['"]react['"]\s*;?\s*$/gm,
    ''
  );

  // Step 2: Transpile JSX -> React.createElement
  const transpiled = await esbuild.transform(cleaned, {
    loader: 'jsx',
    jsx: 'transform',
  });

  let code = transpiled.code;

  // Step 3: Rewrite for CJS
  // - Replace `export default function ComponentName(` with `function ComponentName(`
  // - Replace `export default function(` with `function ` (anonymous default)
  // - Replace `export default {` or `export default ` with assignment
  // - Append module.exports at the end
  
  let exportName = null;

  // Try to extract the function name from "export default function Name("
  const namedMatch = code.match(/^export\s+default\s+function\s+(\w+)\s*\(/m);
  if (namedMatch) {
    exportName = namedMatch[1];
    code = code.replace(/^export\s+default\s+function\s+(\w+)/m, `function $1`);
  } else {
    // Handle "export default function(" (anonymous)
    const anonMatch = code.match(/^export\s+default\s+function\s*\(/m);
    if (anonMatch) {
      exportName = componentName;
      code = code.replace(/^export\s+default\s+function/m, `function ${componentName}`);
    } else {
      // Handle "export default <expression>"
      const exprMatch = code.match(/^export\s+default\s+/m);
      if (exprMatch) {
        // We'll handle this by wrapping
        code = code.replace(/^export\s+default\s+/m, '');
        exportName = componentName;
        code += `\nvar ${componentName} = ${code.match(exprMatch.input.slice(exprMatch.index + exprMatch[0].length))?.[0] || 'null'};\n`;
      }
    }
  }

  // If we found an export name, append module.exports
  if (exportName) {
    code += `\nmodule.exports = ${exportName};\n`;
  } else {
    // Fallback: just try to use the component name as-is
    code += `\nmodule.exports = typeof ${componentName} !== 'undefined' ? ${componentName} : null;\n`;
  }

  // Build the wrapper that provides React via require
  const reactPath = require.resolve('react', { paths: [frontendDir] });
  const reactDomServerPath = require.resolve('react-dom/server', { paths: [frontendDir] });

  const wrapper = `
const React = require(${JSON.stringify(reactPath)});
const { renderToString } = require(${JSON.stringify(reactDomServerPath)});

// Transpiled component:
${code}

// Get the component
const Component = module.exports;
if (typeof Component !== 'function') {
  throw new Error('Component ${componentName} not found or is not a function');
}

const props = ${propsJson};

const element = React.createElement(Component, props);
const html = renderToString(element);

const fullHtml = \`<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f4f6f8;font-family:Georgia,'Times New Roman',Times,serif;">
\${html}
</body>
</html>\`;
console.log(fullHtml);
`;

  // Write to temp .cjs file
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'email-render-'));
  const tmpFile = path.join(tmpDir, 'output.cjs');
  fs.writeFileSync(tmpFile, wrapper, 'utf8');

  try {
    const tmpRequire = createRequire(tmpFile);
    tmpRequire(tmpFile);
  } catch (err) {
    console.error('Render error:', err.message);
    process.exit(1);
  } finally {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
  }
}

main().catch((err) => {
  console.error('Render error:', err.message);
  process.exit(1);
});

