'use client'

import { createContext, useContext, useMemo, type ReactNode } from 'react'
import type { FlagConfig, FlagContext, FlagInstance } from './types'

type FlagContextValue = {
  instance: FlagInstance<any>
  context: FlagContext
}

const FlagCtx = createContext<FlagContextValue | null>(null)

export function FlagProvider<T extends FlagConfig>({
  flags,
  context = {},
  children,
}: {
  flags: FlagInstance<T>
  context?: FlagContext
  children: ReactNode
}) {
  const value = useMemo(
    () => ({ instance: flags, context }),
    [flags, context]
  )
  return <FlagCtx.Provider value={value}>{children}</FlagCtx.Provider>
}

export function useFlag(name: string): boolean {
  const ctx = useContext(FlagCtx)
  if (!ctx) throw new Error('useFlag requires a <FlagProvider> ancestor')
  return ctx.instance.isEnabled(name, ctx.context)
}

export function useFlags(): Record<string, boolean> {
  const ctx = useContext(FlagCtx)
  if (!ctx) throw new Error('useFlags requires a <FlagProvider> ancestor')
  return ctx.instance.getAll(ctx.context)
}
