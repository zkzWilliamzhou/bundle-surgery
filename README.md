# bundle-surgery

**Surgical bundle editing — modify production JS without re-building or invalidating cache.**

## Problem

Frontend deployments require a full rebuild for even tiny bug fixes. Vendor bundles, CDN-cached files, and third-party scripts mean redeploying can take hours. Hotfixes for production incidents are blocked by CI/CD pipelines. Webpack/Rollup cache busting forces users to re-download entire bundles for a one-line change.

## Solution

bundle-surgery performs **ast-surgical patching on already-bundled JavaScript**. Parse minified code into AST, find target declarations, inject fixes, and return a minimal patch diff. Works directly on production `.js`, `.mjs`, `.cjs` files. Uses source-map-aware rewriting to preserve original filenames and stack traces. Supports patch application via runtime service worker injector or build-time patcher.

```javascript
import { patch } from 'bundle-surgery';

const patch = await patch({
  file: 'app.min.js',
  selector: 'function calculatePrice', // name, regex, or AST path
  edit: (node) => {
    // mutate AST node in-place
    node.body.push(new ReturnStatement({ argument: literal(0) }));
  }
});

const newBundle = applyPatch(original, patch);
// newBundle is 50 bytes, original digest unchanged elsewhere
```

## Differentiation

| Feature | bundle-surgery | js-beautify | Rollup Code Splitting | PatchWebpack |
|---------|---------------|-------------|----------------------|--------------|
| **Post-build patching** | ✅ | ❌ | ❌ | ❌ |
| **Minified AST rewrite** | ✅ | ❌ | N/A | N/A |
| **Source-map preservation** | ✅ | ❌ | ✅ | ❌ |
| **Production incident hotfix** | ✅ | ❌ | ❌ | ❌ |
| **Patch size < 1KB** | ✅ | ❌ | N/A | ❌ |
| **Zero rebuild time** | ✅ (<2s) | ❌ | ❌ | ❌ |

## Architecture

- **Minified Parser**: Babel parser with `minified` range handling
- **Surgical Selector**: Name, regex, AST path query, or source position
- **Patch Compiler**: Generates minimal AST diff with variable renaming safety
- **SourceMap Patch**: Updates mappings without re-emitting entire file
- **Runtime Injector**: Service worker intercepts fetch → applies patch in memory

## Quick Start

```bash
npm install bundle-surgery
```

```javascript
import { patch } from 'bundle-surgery';

const patchSet = await patch({
  file: './dist/main.js',
  target: { name: 'fetchUser', args: 2 },
  replace: 'return mockUser()'
});
```

## License

MIT