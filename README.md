# astrogonia

Astro integration for [Gonia](https://github.com/monokrome/gonia) SSR.

Processes Gonia directives at build time, rendering initial values while preserving attributes for client-side hydration.

## Installation

```bash
pnpm add astrogonia gonia
```

## Usage

```js
// astro.config.mjs
import { defineConfig } from 'astro/config'
import astrogonia from 'astrogonia'

export default defineConfig({
  integrations: [astrogonia()]
})
```

The integration automatically configures:
- Gonia vite plugin for client-side transforms
- Vanilla-extract vite plugin (if installed)
- Remark plugin for frontmatter directive declarations

## Options

```js
astrogonia({
  // Initial state for SSR
  state: { count: 0 },

  // Custom directives to register
  directives: {
    custom: myCustomDirective
  },

  // Directory containing Gonia templates (default: 'src/templates')
  templatesDir: 'src/templates',

  // Enable frontmatter directive declarations in markdown (default: true)
  frontmatterDirectives: true,

  // Custom directive source mapping for frontmatter imports
  directiveSources: new Map([
    ['my-directive', './src/directives/my-directive.ts']
  ]),

  // Vanilla-extract integration (default: true)
  // Set false to disable, or pass options
  vanillaExtract: {
    entry: 'src/styles/index.ts',  // default
    styles: preloadedStyles         // optional pre-imported styles
  }
})
```

## Templates

Create HTML templates in your templates directory:

```html
<!-- src/templates/base.html -->
<main id="app"><slot></slot></main>
<footer><slot name="footer"></slot></footer>
```

Use with `g-template`:

```html
<body g-template="base" g-scope={state}>
  <!-- content goes into default slot -->
</body>
```

## How it works

1. **Build time**: After Astro generates HTML, astrogonia processes Gonia directives with initial state
2. **Runtime**: Gonia's `hydrate()` re-attaches reactivity to the existing DOM

This eliminates flash of empty content since initial values are server-rendered.

## License

BSD-2-Clause
