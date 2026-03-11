---
title: "Feature Flags in Next.js Without the Platform Tax"
description: "LaunchDarkly starts at $10/month per seat. PostHog wants to be your whole analytics stack. Here's how to add feature flags to Next.js in about five minutes with zero infrastructure."
date: 2026-03-11
tags: [next.js, feature-flags, react, typescript]
---

Every time I need feature flags, I go through the same mental loop.

LaunchDarkly? That's enterprise software. The pricing page is a consultation form. PostHog is great if you want event tracking, session replays, and a whole analytics product — but I don't. I just need to gate a feature for beta users. Unleash requires you to run a server. Flagsmith, same deal.

So I built [litflag](https://www.npmjs.com/package/litflag). Zero runtime dependencies. No server. No SDK initialization delay. Works in Next.js App Router, middleware, React Server Components, all of it.

Here's how it works.

---

## Install it

```bash
npm install litflag
```

That's the whole setup. No account creation, no API key, no NEXT_PUBLIC environment variables pointing at a SaaS dashboard.

---

## Define your flags

```ts
// lib/flags.ts
import { defineFlags } from 'litflag'

export const flags = defineFlags({
  newCheckout: true,
  betaSearch: false,
  premiumFeature: {
    enabled: false,
    rules: [
      { match: { plan: 'pro' }, value: true },
      { match: { email: '*@company.com' }, value: true },
    ],
  },
  newUI: { enabled: false, percentage: 25 },
})
```

Four flag types here. A simple boolean, a rules-based flag that checks user context, a wildcard email matcher, and a percentage rollout. That covers 95% of what feature flags actually need to do.

---

## Check a flag anywhere

```ts
flags.isEnabled('newCheckout')                          // true
flags.isEnabled('betaSearch')                           // false
flags.isEnabled('premiumFeature', { plan: 'pro' })     // true
flags.isEnabled('premiumFeature', { plan: 'free' })    // false
flags.isEnabled('premiumFeature', { email: 'you@company.com' })  // true
```

The context object is just a plain key-value map. Pass whatever you've got — user plan, email, user ID, account tier, region. The rule matching handles it.

---

## React hooks

Wrap your app (or a subtree of it) with `FlagProvider`, pass in the user's context, and `useFlag` takes care of the rest.

```tsx
// app/layout.tsx
import { FlagProvider } from 'litflag/react'
import { flags } from '@/lib/flags'

export default function RootLayout({ children, user }) {
  return (
    <FlagProvider flags={flags} context={{ plan: user.plan, email: user.email }}>
      {children}
    </FlagProvider>
  )
}
```

```tsx
// components/Checkout.tsx
'use client'
import { useFlag } from 'litflag/react'

export function Checkout() {
  const showNewCheckout = useFlag('newCheckout')
  return showNewCheckout ? <NewCheckout /> : <OldCheckout />
}
```

If you need all flags at once — say, for debugging or passing to analytics — there's `useFlags()`:

```tsx
import { useFlags } from 'litflag/react'

function DebugPanel() {
  const allFlags = useFlags()
  return <pre>{JSON.stringify(allFlags, null, 2)}</pre>
}
```

---

## Next.js middleware (route-level gating)

This is the part that usually requires the most boilerplate with other solutions. `withFlags` wraps your middleware and handles the route matching:

```ts
// middleware.ts
import { withFlags } from 'litflag/next'
import { flags } from '@/lib/flags'

export const middleware = withFlags(flags, {
  '/beta/*': 'betaSearch',
  '/checkout/new/*': 'newCheckout',
})
```

If the flag is disabled, the request gets redirected to `/` by default. You can override that:

```ts
export const middleware = withFlags(flags, {
  '/beta/*': 'betaSearch',
}, {
  redirectTo: '/coming-soon',
  getContext: (req) => ({
    plan: req.cookies.get('plan')?.value ?? 'free',
  }),
})
```

The `getContext` option lets you pull user context from cookies, headers, or wherever you're storing it at the edge.

---

## Environment variable overrides

In production you often want to kill a flag fast without a deploy. litflag reads environment variables automatically using a `LITFLAG_` prefix with the flag name in screaming snake case:

```bash
# Disable new checkout without touching code
LITFLAG_NEW_CHECKOUT=false

# Enable beta search for staging
LITFLAG_BETA_SEARCH=true
```

Useful for canary deployments, quick incident response, or testing in staging.

---

## Dev mode URL overrides

During development, you can override flags via URL query params without touching env vars or code:

```
http://localhost:3000/checkout?flags=newCheckout:true,betaSearch:false
```

This only works when `NODE_ENV === 'development'`, so there's no risk of this leaking into production.

---

## When to use something else

litflag is the right tool when your flags are relatively stable and you're okay with deploying to change them. The flags are defined in code, not a database. A flag change is a deploy.

If you need to toggle flags in real time without a deploy — like killing a feature for a specific user ID at 2am from a dashboard — you want a real feature flag platform. LaunchDarkly actually earns its price tag at that level. PostHog is solid too if you already use it for analytics.

But for most teams shipping features incrementally and doing percentage rollouts? The SaaS overhead isn't worth it. Define the flags in code, ship it, done.

---

## The full picture

Here's what a complete flags setup looks like in a real Next.js app:

```
lib/
  flags.ts          ← define all your flags here
middleware.ts       ← route-level gating with withFlags
app/
  layout.tsx        ← FlagProvider wraps the app, passes user context
  components/
    Feature.tsx     ← useFlag() where you need it
```

Four files. No account. No SDK calls on every request. No latency from a remote flag evaluation service.

```bash
npm install litflag
```
