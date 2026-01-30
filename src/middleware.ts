/**
 * Astrogonia middleware for dev-mode SSR processing.
 */
import { readFile, access } from 'node:fs/promises'
import { join } from 'node:path'
import { render, registerDirective, registerService, type DirectiveRegistry } from 'gonia/server'
import { directives, createServerRegistry } from 'gonia'
import type { MiddlewareHandler } from 'astro'

async function createRegistry(rootDir: string): Promise<DirectiveRegistry> {
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

  // Try to load custom directives from project (side-effect import)
  const directivesPath = join(rootDir, 'src/directives/index.ts')
  try {
    await access(directivesPath)
    await import(directivesPath)
  } catch {
    // No custom directives found
  }

  return registry
}

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&quot;/g, '"')
    .replace(/&#34;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
}

async function processHtmlString(
  html: string,
  registry: DirectiveRegistry,
): Promise<string> {
  const isFullDocument = /^\s*<!DOCTYPE|^\s*<html/i.test(html)
  if (!isFullDocument) {
    return html
  }

  const bodyMatch = html.match(/<body([^>]*)>([\s\S]*)<\/body>/i)
  if (!bodyMatch) {
    return html
  }

  const bodyAttrs = bodyMatch[1]
  const bodyContent = bodyMatch[2]

  // Extract and decode g-scope state from body attributes
  let state: Record<string, unknown> = {}
  const scopeMatch = bodyAttrs.match(/g-scope="([^"]*)"|g-scope='([^']*)'/)
  const scopeValue = scopeMatch?.[1] ?? scopeMatch?.[2]
  if (scopeValue) {
    try {
      state = JSON.parse(decodeHtmlEntities(scopeValue))
    } catch {
      // Invalid JSON in g-scope
    }
  }

  // Extract g-* directive attributes from body so gonia can process them
  const directiveAttrs: string[] = []
  bodyAttrs.replace(/\s*g-(?!scope\b)[a-z-]+(?::[a-z-]+)?(?:="[^"]*")?/gi, (match) => {
    directiveAttrs.push(match.trim())
    return ''
  })

  // Wrap body content with directives so gonia processes them natively
  const wrapper = directiveAttrs.length > 0
    ? `<div ${directiveAttrs.join(' ')}>${bodyContent}</div>`
    : bodyContent

  const renderedContent = await render(wrapper, state, registry)

  // Unwrap if we added a wrapper
  let finalContent = renderedContent
  if (directiveAttrs.length > 0) {
    const innerMatch = renderedContent.match(/^<div[^>]*>([\s\S]*)<\/div>$/)
    if (innerMatch) {
      finalContent = innerMatch[1]
    }
  }

  // Strip g-template from body attrs - already processed server-side
  const finalBodyAttrs = bodyAttrs.replace(/\s*g-template="[^"]*"|\s*g-template='[^']*'/g, '')

  return html.replace(
    /<body([^>]*)>([\s\S]*)<\/body>/i,
    `<body${finalBodyAttrs}>${finalContent}</body>`
  )
}

let registry: DirectiveRegistry | null = null

export const onRequest: MiddlewareHandler = async (context, next) => {
  const response = await next()

  const contentType = response.headers.get('content-type')
  if (!contentType?.includes('text/html')) {
    return response
  }

  const html = await response.text()

  if (!html.includes('g-')) {
    return new Response(html, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers
    })
  }

  // Get root dir from process.cwd()
  const rootDir = process.cwd()
  const templatesDir = 'src/templates'

  // Create registry with custom directives (cached after first request)
  if (!registry) {
    registry = await createRegistry(rootDir)
  }

  // Set up template registry
  const templatesPath = join(rootDir, templatesDir)
  const templateRegistry = createServerRegistry(
    (path) => readFile(path, 'utf-8'),
    templatesPath + '/'
  )
  registerService('$templates', templateRegistry)

  try {
    const processed = await processHtmlString(html, registry)

    // Create new headers without content-length (it will be set automatically)
    const headers = new Headers(response.headers)
    headers.delete('content-length')

    return new Response(processed, {
      status: response.status,
      statusText: response.statusText,
      headers
    })
  } catch (err) {
    console.error('[astrogonia] SSR error:', err)
    return new Response(html, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers
    })
  }
}
