import { describe, it, expect } from 'vitest'
import astrogonia from './index.js'

describe('astrogonia', () => {
  it('returns an Astro integration', () => {
    const integration = astrogonia()
    expect(integration.name).toBe('astrogonia')
    expect(integration.hooks).toHaveProperty('astro:config:setup')
  })

  it('accepts custom options', () => {
    const integration = astrogonia({
      state: { foo: 'bar' }
    })
    expect(integration.name).toBe('astrogonia')
  })
})
