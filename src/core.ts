import type { FlagConfig, FlagContext, FlagDefinition, FlagInstance } from './types'

function hashToPercent(key: string): number {
  let hash = 0
  for (let i = 0; i < key.length; i++) {
    hash = ((hash << 5) - hash) + key.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash) % 100
}

function matchRule(
  match: Record<string, string | number | boolean | string[]>,
  context: FlagContext
): boolean {
  return Object.entries(match).every(([key, pattern]) => {
    const value = context[key]
    if (value === undefined) return false
    if (Array.isArray(pattern)) return pattern.includes(value as string)
    if (typeof pattern === 'string' && pattern.includes('*')) {
      const regex = new RegExp(
        '^' + pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$'
      )
      return regex.test(String(value))
    }
    return value === pattern
  })
}

function getEnvOverride(name: string): boolean | undefined {
  if (typeof process === 'undefined' || !process.env) return undefined
  const snakeCase = name.replace(/([A-Z])/g, '_$1').toUpperCase()
  const val = process.env[`LITFLAG_${snakeCase}`]
  if (val === 'true' || val === '1') return true
  if (val === 'false' || val === '0') return false
  return undefined
}

function resolve(
  flag: FlagDefinition,
  context?: FlagContext,
  flagKey?: string
): boolean {
  if (typeof flag === 'boolean') return flag

  if (flag.rules && context) {
    for (const rule of flag.rules) {
      if (matchRule(rule.match, context)) return rule.value
    }
  }

  if (flag.percentage !== undefined && context?.userId) {
    const hash = hashToPercent(`${flagKey}:${context.userId}`)
    return hash < flag.percentage
  }

  return flag.enabled
}

export function defineFlags<T extends FlagConfig>(config: T): FlagInstance<T> {
  const overrides = new Map<string, boolean>()

  function evaluate(name: string, context?: FlagContext): boolean {
    const envVal = getEnvOverride(name)
    if (envVal !== undefined) return envVal

    if (overrides.has(name)) return overrides.get(name)!

    const flag = config[name]
    if (flag === undefined) return false
    return resolve(flag, context, name)
  }

  return {
    isEnabled: (name, context) => evaluate(name as string, context),

    getAll: (context) => {
      const result = {} as Record<keyof T, boolean>
      for (const key of Object.keys(config)) {
        (result as any)[key] = evaluate(key, context)
      }
      return result
    },

    override: (name, value) => {
      overrides.set(name as string, value)
    },

    clearOverrides: () => {
      overrides.clear()
    },
  }
}
