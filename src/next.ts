import { NextRequest, NextResponse } from 'next/server'
import type { FlagConfig, FlagContext, FlagInstance } from './types'

export function withFlags<T extends FlagConfig>(
  flags: FlagInstance<T>,
  routes: Record<string, keyof T & string>,
  options?: {
    getContext?: (req: NextRequest) => FlagContext
    redirectTo?: string
  }
) {
  return function middleware(req: NextRequest) {
    const context = options?.getContext?.(req) || {}

    // Dev mode: override flags via URL — ?flags=name:true,name2:false
    if (process.env.NODE_ENV === 'development') {
      const flagParams = req.nextUrl.searchParams.get('flags')
      if (flagParams) {
        for (const pair of flagParams.split(',')) {
          const [name, value] = pair.split(':')
          if (name) flags.override(name as any, value === 'true')
        }
      }
    }

    for (const [pattern, flagName] of Object.entries(routes)) {
      const regex = new RegExp(
        '^' + pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$'
      )

      if (regex.test(req.nextUrl.pathname) && !flags.isEnabled(flagName as any, context)) {
        const redirectTo = options?.redirectTo || '/'
        return NextResponse.redirect(new URL(redirectTo, req.url))
      }
    }

    return NextResponse.next()
  }
}
