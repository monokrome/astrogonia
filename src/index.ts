/**
 * Astrogonia - Astro integration for Gonia SSR.
 *
 * @packageDocumentation
 */

import type { AstroIntegration } from 'astro'
import { render, registerDirective, type DirectiveRegistry } from 'gonia/server'
import { directives } from 'gonia'
import { remarkDirectives, type RemarkDirectivesOptions } from './remark-directives.js'

export { remarkDirectives, type RemarkDirectivesOptions }

// Re-export gonia APIs for convenience
export {
  // Core types
  Mode,
  Expression,
  Context,
  Directive,
  directive,
  getDirective,
  getDirectiveNames,
  clearDirectives,
  configureDirective,
  type DirectiveMeta,

  // Context system
  createContext,
  createChildContext,
  createContextKey,
  registerContext,
  resolveContext,
  hasContext,
  removeContext,
  clearContexts,
  type ContextKey,

  // Reactivity
  reactive,
  effect,
  createScope,
  createEffectScope,
  type EffectScope,

  // Templates
  createTemplateRegistry,
  createMemoryRegistry,
  createServerRegistry,
  type TemplateRegistry,

  // Utilities
  findRoots,
  parseInterpolation,
  getInjectables,
  isContextKey,
  type Injectable,
  getRootScope,
  clearRootScope,
  findAncestor,

  // Built-in directives
  directives,
} from 'gonia'

export interface AstrogoniaOptions {
  /**
   * Initial state for SSR.
   */
  state?: Record<string, unknown>
  /**
   * Custom directives to register for SSR.
   */
  directives?: Record<string, unknown>
  /**
   * Enable frontmatter directive declarations in markdown.
   * When true, adds a remark plugin that reads `directive` from frontmatter.
   * @defaultValue true
   */
  frontmatterDirectives?: boolean
  /**
   * Custom directive source mapping for frontmatter imports.
   * Maps directive names to their module paths.
   */
  directiveSources?: Map<string, string>
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
  const enableFrontmatter = options.frontmatterDirectives ?? true

  if (options.directives) {
    for (const [name, directive] of Object.entries(options.directives)) {
      registerDirective(registry, name, directive as never)
    }
  }

  return {
    name: 'astrogonia',
    hooks: {
      'astro:config:setup': ({ updateConfig }) => {
        const config: Parameters<typeof updateConfig>[0] = {
          vite: {
            plugins: [goniaVitePlugin(options, registry)]
          }
        }

        if (enableFrontmatter) {
          config.markdown = {
            remarkPlugins: [
              [remarkDirectives, { directiveSources: options.directiveSources }]
            ]
          }
        }

        updateConfig(config)
      }
    }
  }
}
