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
import { gonia } from 'gonia/vite'
import astrogonia from 'astrogonia'

export default defineConfig({
  integrations: [astrogonia()],
  vite: {
    plugins: [gonia()]
  }
})
```

Use both:
- `astrogonia` - SSR processing of directives at build time
- `gonia/vite` - client-side directive auto-imports and transforms

## Options

```js
astrogonia({
  // Initial state for SSR
  state: { count: 0 },

  // Custom directives to register
  directives: {
    custom: myCustomDirective
  }
})
```

## How it works

1. **Build time**: astrogonia evaluates directives like `g-text="count"` with initial state, rendering the value into the HTML
2. **Runtime**: Gonia's `hydrate()` re-attaches reactivity to the existing DOM

This eliminates flash of empty content since initial values are server-rendered.

## License

MIT
