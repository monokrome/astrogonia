import { describe, it, expect, vi } from 'vitest'
import astrogonia, { remarkDirectives } from './index.js'

describe('astrogonia', () => {
  describe('integration', () => {
    it('returns an Astro integration with correct name', () => {
      const integration = astrogonia()
      expect(integration.name).toBe('astrogonia')
    })

    it('provides astro:config:setup hook', () => {
      const integration = astrogonia()
      expect(integration.hooks).toHaveProperty('astro:config:setup')
    })

    it('accepts custom state option', () => {
      const integration = astrogonia({
        state: { count: 0, name: 'test' }
      })
      expect(integration.name).toBe('astrogonia')
    })

    it('accepts custom directives option', () => {
      const customDirective = vi.fn()
      const integration = astrogonia({
        directives: { custom: customDirective }
      })
      expect(integration.name).toBe('astrogonia')
    })
  })

  describe('config:setup hook', () => {
    it('calls updateConfig with vite plugins and markdown config', () => {
      const integration = astrogonia()
      const updateConfig = vi.fn()

      const hook = integration.hooks['astro:config:setup'] as unknown as (options: { updateConfig: typeof updateConfig }) => void
      hook({ updateConfig })

      expect(updateConfig).toHaveBeenCalledTimes(1)

      const config = updateConfig.mock.calls[0][0]
      expect(config.vite.plugins).toHaveLength(1)
      expect(config.vite.plugins[0].name).toBe('astrogonia')
      expect(config.markdown.remarkPlugins).toHaveLength(1)
    })

    it('vite plugin has enforce: post', () => {
      const integration = astrogonia()
      const updateConfig = vi.fn()

      const hook = integration.hooks['astro:config:setup'] as unknown as (options: { updateConfig: typeof updateConfig }) => void
      hook({ updateConfig })

      const config = updateConfig.mock.calls[0][0]
      const plugin = config.vite.plugins[0]
      expect(plugin.enforce).toBe('post')
    })

    it('vite plugin has transformIndexHtml hook', () => {
      const integration = astrogonia()
      const updateConfig = vi.fn()

      const hook = integration.hooks['astro:config:setup'] as unknown as (options: { updateConfig: typeof updateConfig }) => void
      hook({ updateConfig })

      const config = updateConfig.mock.calls[0][0]
      const plugin = config.vite.plugins[0]
      expect(plugin.transformIndexHtml).toBeDefined()
      expect(typeof plugin.transformIndexHtml).toBe('function')
    })

    it('can disable frontmatter directives', () => {
      const integration = astrogonia({ frontmatterDirectives: false })
      const updateConfig = vi.fn()

      const hook = integration.hooks['astro:config:setup'] as unknown as (options: { updateConfig: typeof updateConfig }) => void
      hook({ updateConfig })

      const config = updateConfig.mock.calls[0][0]
      expect(config.markdown).toBeUndefined()
    })
  })

  describe('remarkDirectives', () => {
    it('exports remarkDirectives plugin', () => {
      expect(remarkDirectives).toBeDefined()
      expect(typeof remarkDirectives).toBe('function')
    })

    it('returns a transform function', () => {
      const plugin = remarkDirectives()
      expect(typeof plugin).toBe('function')
    })
  })
})
