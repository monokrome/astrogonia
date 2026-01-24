import { describe, it, expect, vi } from 'vitest'
import astrogonia from './index.js'

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
    it('calls updateConfig with vite plugins', () => {
      const integration = astrogonia()
      const updateConfig = vi.fn()

      const hook = integration.hooks['astro:config:setup'] as unknown as (options: { updateConfig: typeof updateConfig }) => void
      hook({ updateConfig })

      expect(updateConfig).toHaveBeenCalledTimes(1)
      expect(updateConfig).toHaveBeenCalledWith({
        vite: {
          plugins: expect.arrayContaining([
            expect.objectContaining({ name: 'astrogonia' })
          ])
        }
      })
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
  })
})
