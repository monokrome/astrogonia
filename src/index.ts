/**
 * Astrogonia - Astro integration for Gonia SSR.
 *
 * @packageDocumentation
 */

import type { AstroIntegration } from 'astro'
import { render, registerDirective, type DirectiveRegistry } from 'gonia/server'
import { directives } from 'gonia'

export interface AstrogoniaOptions {
  /**
   * Initial state for SSR.
   */
  state?: Record<string, unknown>
  /**
   * Custom directives to register.
   */
  directives?: Record<string, unknown>
}

function createDefaultRegistry(): DirectiveRegistry {
  const registry: DirectiveRegistry = new Map()

  const builtins: Array<[string, unknown]> = [
    ['text', directives.text],
    ['show', directives.show],
    ['class', directives.cclass],
    ['for', directives.cfor],
    ['if', directives.cif],
    ['html', directives.html],
    ['model', directives.model],
    ['on', directives.on],
  ]

  for (const [name, directive] of builtins) {
    registerDirective(registry, name, directive as never)
  }

  return registry
}

function goniaVitePlugin(options: AstrogoniaOptions, registry: DirectiveRegistry) {
  return {
    name: 'astrogonia',
    enforce: 'post' as const,

    async transformIndexHtml(html: string) {
      const stateMatch = html.match(/<script id="gonia-state" type="application\/json">([\s\S]*?)<\/script>/)
      let state: Record<string, unknown> = options.state ?? {}

      if (stateMatch) {
        try {
          state = { ...state, ...JSON.parse(stateMatch[1]) }
        } catch {
          // Invalid JSON, use default state
        }
      }

      const rendered = await render(html, state, registry)
      return rendered
    }
  }
}

/**
 * Astro integration for Gonia SSR.
 *
 * @example
 * ```ts
 * // astro.config.mjs
 * import { defineConfig } from 'astro/config'
 * import astrogonia from 'astrogonia'
 *
 * export default defineConfig({
 *   integrations: [astrogonia()]
 * })
 * ```
 */
export default function astrogonia(options: AstrogoniaOptions = {}): AstroIntegration {
  const registry = createDefaultRegistry()

  if (options.directives) {
    for (const [name, directive] of Object.entries(options.directives)) {
      registerDirective(registry, name, directive as never)
    }
  }

  return {
    name: 'astrogonia',
    hooks: {
      'astro:config:setup': ({ updateConfig }) => {
        updateConfig({
          vite: {
            plugins: [goniaVitePlugin(options, registry)]
          }
        })
      }
    }
  }
}
