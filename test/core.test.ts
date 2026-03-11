import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { defineFlags } from '../src/core'

describe('defineFlags', () => {
  describe('boolean flags', () => {
    it('returns the configured value', () => {
      const flags = defineFlags({ enabled: true, disabled: false })
      expect(flags.isEnabled('enabled')).toBe(true)
      expect(flags.isEnabled('disabled')).toBe(false)
    })

    it('returns false for unknown flags', () => {
      const flags = defineFlags({ known: true })
      expect(flags.isEnabled('unknown' as any)).toBe(false)
    })
  })

  describe('rules', () => {
    it('matches exact values', () => {
      const flags = defineFlags({
        premium: {
          enabled: false,
          rules: [{ match: { plan: 'pro' }, value: true }],
        },
      })
      expect(flags.isEnabled('premium')).toBe(false)
      expect(flags.isEnabled('premium', { plan: 'pro' })).toBe(true)
      expect(flags.isEnabled('premium', { plan: 'free' })).toBe(false)
    })

    it('matches wildcard patterns', () => {
      const flags = defineFlags({
        internal: {
          enabled: false,
          rules: [{ match: { email: '*@company.com' }, value: true }],
        },
      })
      expect(flags.isEnabled('internal', { email: 'todd@company.com' })).toBe(true)
      expect(flags.isEnabled('internal', { email: 'todd@gmail.com' })).toBe(false)
    })

    it('matches array values (any-of)', () => {
      const flags = defineFlags({
        beta: {
          enabled: false,
          rules: [{ match: { userId: ['u1', 'u2', 'u3'] as any }, value: true }],
        },
      })
      expect(flags.isEnabled('beta', { userId: 'u1' })).toBe(true)
      expect(flags.isEnabled('beta', { userId: 'u99' })).toBe(false)
    })

    it('requires all match conditions (AND logic)', () => {
      const flags = defineFlags({
        feature: {
          enabled: false,
          rules: [{ match: { plan: 'pro', region: 'us' }, value: true }],
        },
      })
      expect(flags.isEnabled('feature', { plan: 'pro', region: 'us' })).toBe(true)
      expect(flags.isEnabled('feature', { plan: 'pro', region: 'eu' })).toBe(false)
      expect(flags.isEnabled('feature', { plan: 'pro' })).toBe(false)
    })

    it('first matching rule wins', () => {
      const flags = defineFlags({
        feature: {
          enabled: false,
          rules: [
            { match: { email: 'admin@co.com' }, value: true },
            { match: { email: '*@co.com' }, value: false },
          ],
        },
      })
      expect(flags.isEnabled('feature', { email: 'admin@co.com' })).toBe(true)
      expect(flags.isEnabled('feature', { email: 'user@co.com' })).toBe(false)
    })
  })

  describe('percentage rollout', () => {
    it('deterministically assigns users based on userId', () => {
      const flags = defineFlags({
        newUI: { enabled: false, percentage: 50 },
      })
      const result1 = flags.isEnabled('newUI', { userId: 'user_123' })
      const result2 = flags.isEnabled('newUI', { userId: 'user_123' })
      expect(result1).toBe(result2)
    })

    it('respects percentage boundaries', () => {
      const flags0 = defineFlags({ f: { enabled: false, percentage: 0 } })
      const flags100 = defineFlags({ f: { enabled: false, percentage: 100 } })
      expect(flags0.isEnabled('f', { userId: 'anyone' })).toBe(false)
      expect(flags100.isEnabled('f', { userId: 'anyone' })).toBe(true)
    })

    it('falls back to enabled value when no userId in context', () => {
      const flags = defineFlags({
        feature: { enabled: true, percentage: 50 },
      })
      expect(flags.isEnabled('feature')).toBe(true)
    })

    it('distributes roughly evenly across users', () => {
      const flags = defineFlags({
        halfAndHalf: { enabled: false, percentage: 50 },
      })
      let enabled = 0
      for (let i = 0; i < 1000; i++) {
        if (flags.isEnabled('halfAndHalf', { userId: `user_${i}` })) enabled++
      }
      // Should be roughly 500 ± 100
      expect(enabled).toBeGreaterThan(350)
      expect(enabled).toBeLessThan(650)
    })
  })

  describe('overrides', () => {
    it('runtime override takes precedence over config', () => {
      const flags = defineFlags({ feature: false })
      expect(flags.isEnabled('feature')).toBe(false)

      flags.override('feature', true)
      expect(flags.isEnabled('feature')).toBe(true)

      flags.clearOverrides()
      expect(flags.isEnabled('feature')).toBe(false)
    })
  })

  describe('env var overrides', () => {
    const originalEnv = process.env

    beforeEach(() => {
      process.env = { ...originalEnv }
    })

    afterEach(() => {
      process.env = originalEnv
    })

    it('reads LITFLAG_ env vars', () => {
      process.env.LITFLAG_MY_FEATURE = 'true'
      const flags = defineFlags({ myFeature: false })
      expect(flags.isEnabled('myFeature')).toBe(true)
    })

    it('supports 1 and 0 as boolean values', () => {
      process.env.LITFLAG_FEATURE = '1'
      const flags = defineFlags({ feature: false })
      expect(flags.isEnabled('feature')).toBe(true)
    })

    it('env override beats config and runtime override', () => {
      process.env.LITFLAG_FEATURE = 'false'
      const flags = defineFlags({ feature: true })
      flags.override('feature', true)
      expect(flags.isEnabled('feature')).toBe(false)
    })
  })

  describe('getAll', () => {
    it('returns all flag values', () => {
      const flags = defineFlags({
        a: true,
        b: false,
        c: { enabled: true },
      })
      expect(flags.getAll()).toEqual({ a: true, b: false, c: true })
    })

    it('applies context to all flags', () => {
      const flags = defineFlags({
        basic: true,
        premium: {
          enabled: false,
          rules: [{ match: { plan: 'pro' }, value: true }],
        },
      })
      expect(flags.getAll({ plan: 'pro' })).toEqual({ basic: true, premium: true })
      expect(flags.getAll({ plan: 'free' })).toEqual({ basic: true, premium: false })
    })
  })
})
