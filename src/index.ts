/**
 * Astrogonia - Astro integration for Gonia SSR.
 *
 * @packageDocumentation
 */

import type { AstroIntegration } from 'astro'
import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { render, registerDirective, registerService, type DirectiveRegistry } from 'gonia/server'
import { directives, createServerRegistry } from 'gonia'
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

export interface VanillaExtractOptions {
  /**
   * Entry file for styles (relative to project root).
   * @defaultValue 'src/styles/index.ts'
   */
  entry?: string
  /**
   * Pre-imported styles object.
   * If provided, skips dynamic import and uses these directly.
   */
  styles?: Record<string, unknown>
}

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
  /**
   * Directory containing Gonia templates (relative to project root).
   * Templates are .html files that can be used with g-template directive.
   * @defaultValue 'src/templates'
   */
  templatesDir?: string
  /**
   * Enable Astro's JSX-style templating alongside Gonia.
   * When false, pages should use g-template for layouts.
   * @defaultValue false
   */
  astroTemplating?: boolean
  /**
   * Enable vanilla-extract CSS integration.
   * When true, uses convention (src/styles/index.ts).
   * Pass object to customize entry path.
   * Styles are registered as $styles service for DI.
   * @defaultValue true
   */
  vanillaExtract?: boolean | VanillaExtractOptions
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
    ['template', directives.template],
    ['slot', directives.slot],
  ]

  for (const [name, directive] of builtins) {
    registerDirective(registry, name, directive as never)
  }

  return registry
}

async function processHtmlFile(
  filePath: string,
  options: AstrogoniaOptions,
  registry: DirectiveRegistry
): Promise<void> {
  const html = await readFile(filePath, 'utf-8')

  const stateMatch = html.match(/<script id="gonia-state" type="application\/json">([\s\S]*?)<\/script>/)
  let state: Record<string, unknown> = options.state ?? {}

  if (stateMatch) {
    try {
      state = { ...state, ...JSON.parse(stateMatch[1]) }
    } catch {
      // Invalid JSON, use default state
    }
  }

  // Check if this is a full HTML document
  const isFullDocument = /^\s*<!DOCTYPE|^\s*<html/i.test(html)

  let rendered: string
  if (isFullDocument) {
    // Extract body content, process it, then reconstruct
    const bodyMatch = html.match(/<body([^>]*)>([\s\S]*)<\/body>/i)
    if (bodyMatch) {
      const bodyAttrs = bodyMatch[1] // includes leading space if attrs exist
      const bodyContent = bodyMatch[2]

      // Extract g-scope from body attributes and merge into state
      // Decode HTML entities to get the actual JSON
      // Match double-quoted or single-quoted attribute values properly
      const scopeMatch = bodyAttrs.match(/g-scope="([^"]*)"|g-scope='([^']*)'/)
      const scopeValue = scopeMatch?.[1] ?? scopeMatch?.[2]
      if (scopeValue) {
        try {
          const scopeJson = scopeValue
            .replace(/&quot;/g, '"')
            .replace(/&#34;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/&apos;/g, "'")
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&amp;/g, '&')
          const scopeData = JSON.parse(scopeJson)
          state = { ...state, ...scopeData }
        } catch {
          // Invalid JSON in g-scope, continue with existing state
        }
      }

      // Process only the body content, not the attributes
      // This avoids HTML entity encoding issues with g-scope values
      const renderedContent = await render(bodyContent, state, registry)

      rendered = html.replace(
        /<body([^>]*)>([\s\S]*)<\/body>/i,
        `<body${bodyAttrs}>${renderedContent}</body>`
      )
    } else {
      rendered = html
    }
  } else {
    rendered = await render(html, state, registry)
  }

  if (rendered !== html) {
    await writeFile(filePath, rendered)
  }
}

function setupTemplateRegistry(rootDir: string, templatesDir: string): void {
  const templatesPath = join(rootDir, templatesDir)
  const registry = createServerRegistry(
    (path) => readFile(path, 'utf-8'),
    templatesPath + '/'
  )
  registerService('$templates', registry)
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
  const templatesDir = options.templatesDir ?? 'src/templates'
  const vanillaExtract = options.vanillaExtract ?? true
  let rootDir = ''

  if (options.directives) {
    for (const [name, directive] of Object.entries(options.directives)) {
      registerDirective(registry, name, directive as never)
    }
  }

  // Parse vanilla-extract options
  const veEnabled = vanillaExtract !== false
  const veOptions = typeof vanillaExtract === 'object' ? vanillaExtract : {}
  const veEntry = veOptions.entry ?? 'src/styles/index.ts'
  const veStyles = veOptions.styles

  return {
    name: 'astrogonia',
    hooks: {
      'astro:config:setup': async ({ config, updateConfig }) => {
        rootDir = config.root.pathname

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const vitePlugins: any[] = []

        // Add vanilla-extract vite plugin if enabled
        if (veEnabled) {
          try {
            const ve = await import('@vanilla-extract/vite-plugin' as string) as { vanillaExtractPlugin: () => unknown }
            vitePlugins.push(ve.vanillaExtractPlugin())
          } catch {
            // vanilla-extract not installed, skip
          }
        }

        // Add gonia vite plugin
        try {
          const goniaVite = await import('gonia/vite' as string) as { gonia: () => unknown }
          vitePlugins.push(goniaVite.gonia())
        } catch {
          // gonia/vite not available, skip
        }

        const updates: Parameters<typeof updateConfig>[0] = {}

        if (vitePlugins.length > 0) {
          updates.vite = { plugins: vitePlugins }
        }

        if (enableFrontmatter) {
          updates.markdown = {
            remarkPlugins: [
              [remarkDirectives, { directiveSources: options.directiveSources }]
            ]
          }
        }

        updateConfig(updates)
      },

      'astro:build:done': async ({ dir, pages }) => {
        // Set up template registry for g-template directive
        setupTemplateRegistry(rootDir, templatesDir)

        // Note: vanilla-extract styles are passed via g-state from pages,
        // not imported here (vanilla-extract requires vite plugin context)

        // Process all HTML files after they've been written to disk
        // pages[].pathname is like '' (root) or 'hello-world/' (trailing slash)
        const htmlFiles = pages.map(p => {
          const pathname = p.pathname || ''
          const path = pathname === '' ? 'index.html' : `${pathname}index.html`
          return new URL(path, dir)
        })

        await Promise.all(
          htmlFiles.map(url => processHtmlFile(url.pathname, options, registry))
        )
      }
    }
  }
}
