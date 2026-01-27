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
    it('calls updateConfig with markdown config when frontmatter enabled', async () => {
      const integration = astrogonia()
      const updateConfig = vi.fn()
      const config = { root: new URL('file:///test/') }

      const hook = integration.hooks['astro:config:setup'] as unknown as (options: { config: typeof config, updateConfig: typeof updateConfig }) => Promise<void>
      await hook({ config, updateConfig })

      expect(updateConfig).toHaveBeenCalledTimes(1)

      const updateArgs = updateConfig.mock.calls[0][0]
      expect(updateArgs.markdown?.remarkPlugins).toHaveLength(1)
    })

    it('can disable frontmatter directives', async () => {
      const integration = astrogonia({ frontmatterDirectives: false })
      const updateConfig = vi.fn()
      const config = { root: new URL('file:///test/') }

      const hook = integration.hooks['astro:config:setup'] as unknown as (options: { config: typeof config, updateConfig: typeof updateConfig }) => Promise<void>
      await hook({ config, updateConfig })

      const updateArgs = updateConfig.mock.calls[0][0]
      expect(updateArgs.markdown).toBeUndefined()
    })
  })

  describe('build:done hook', () => {
    it('provides astro:build:done hook', () => {
      const integration = astrogonia()
      expect(integration.hooks).toHaveProperty('astro:build:done')
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
