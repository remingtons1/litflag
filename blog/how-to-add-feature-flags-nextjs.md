---
title: "Feature Flags in Next.js Without the Enterprise Tax"
date: 2026-03-11
description: "How to add feature flags to your Next.js app in 5 minutes. No LaunchDarkly, no PostHog, no accounts. Just npm install and go."
tags: [nextjs, feature-flags, react, typescript]
---

# Feature Flags in Next.js Without the Enterprise Tax

I needed feature flags last week. Went to set up LaunchDarkly. Pricing page wanted me to "talk to sales." For boolean toggles.

Then I looked at PostHog. It does flags, but I'd be adopting an entire analytics platform just to turn features on and off. That's like buying a truck because you need a cup holder.

So I built litflag. It's a 4KB npm package. Zero dependencies. Works in 5 minutes.

## The setup

```bash
npm install litflag
```

Create a flags file. I usually put it at `lib/flags.ts`:

```ts
import { defineFlags } from 'litflag'

export const flags = defineFlags({
  newCheckout: true,
  betaSearch: false,
})
```

That's your config. Booleans. Use them anywhere:

```ts
import { flags } from '@/lib/flags'

if (flags.isEnabled('newCheckout')) {
  // ship it
}
```

TypeScript autocompletes the flag names. Typos are compile errors.

## Targeting specific users

Booleans are fine for global rollouts. But sometimes you want a flag on for pro users, off for everyone else.

```ts
export const flags = defineFlags({
  advancedAnalytics: {
    enabled: false,
    rules: [
      { match: { plan: 'pro' }, value: true },
      { match: { plan: 'enterprise' }, value: true },
    ],
  },
})
```

Then pass context when you check:

```ts
flags.isEnabled('advancedAnalytics', { plan: user.plan })
```

Rules support exact match, wildcards, and arrays. Want to enable something for your whole team?

```ts
rules: [
  { match: { email: '*@yourcompany.com' }, value: true },
]
```

Multiple conditions in one rule are AND logic. First matching rule wins.

## Gradual rollouts

Roll out to 10% of users, watch for errors, bump to 50%, then ship to everyone:

```ts
export const flags = defineFlags({
  newDashboard: {
    enabled: false,
    percentage: 10,
  },
})

flags.isEnabled('newDashboard', { userId: user.id })
```

The hash is deterministic — same user always sees the same result. No flickering.

## React components

Wrap your app with the provider, use hooks in components:

```tsx
import { FlagProvider, useFlag } from 'litflag/react'
import { flags } from '@/lib/flags'

// In your layout or _app
<FlagProvider flags={flags} context={{ plan: user.plan, userId: user.id }}>
  <App />
</FlagProvider>
```

```tsx
function PricingPage() {
  const showNewPricing = useFlag('newPricing')

  if (showNewPricing) {
    return <NewPricingTable />
  }
  return <CurrentPricingTable />
}
```

Context flows down from the provider so you don't pass it on every hook call.

## Gating routes with Next.js middleware

Want `/beta` to 404 unless the beta flag is on?

```ts
// middleware.ts
import { withFlags } from 'litflag/next'
import { flags } from '@/lib/flags'

export const middleware = withFlags(flags, {
  '/beta/*': 'betaSearch',
  '/new-checkout': 'newCheckout',
}, {
  redirectTo: '/waitlist',
  getContext: (req) => ({
    plan: req.cookies.get('plan')?.value || 'free',
  }),
})
```

Flag off? User gets redirected. Flag on? Request passes through.

In dev, you can override any flag via URL: `?flags=betaSearch:true,newCheckout:false`. Saves you from editing config while testing.

## Environment variable overrides

This is the part I use most. Different flag values per environment without changing code:

```
# .env.production
LITFLAG_BETA_SEARCH=false

# .env.staging
LITFLAG_BETA_SEARCH=true
```

Env vars have highest priority. They override config, rules, and runtime overrides. Good for kill switches — if something breaks in production, flip an env var and redeploy.

## Why not just use env vars for everything?

You could. For simple on/off flags, env vars work. But once you need "on for pro users, off for everyone else" or "roll out to 20% of traffic," env vars can't do that. litflag handles both cases with the same API.

## The full priority order

1. Environment variables (`LITFLAG_*`)
2. Runtime overrides (`flags.override()`)
3. Rules (first match wins)
4. Percentage rollout
5. Default value

Runtime overrides are handy for admin panels or testing:

```ts
flags.override('newCheckout', true)
// test the new flow
flags.clearOverrides()
```

## What this doesn't do

No dashboard. No analytics. No A/B test statistics. If you need those, use PostHog or LaunchDarkly — they're good at that stuff.

litflag does one thing: evaluate flags fast, with no external dependencies. It runs in your process, reads from your config, and gets out of the way.

4KB. Zero dependencies. Works everywhere Next.js runs.

```bash
npm install litflag
```
