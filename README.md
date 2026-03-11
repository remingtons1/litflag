# litflag

Feature flags without the infrastructure. No server, no accounts, no SDK lock-in.

## Install

```bash
npm install litflag
```

## Quick start

```ts
import { defineFlags } from 'litflag'

const flags = defineFlags({
  newCheckout: true,
  betaSearch: false,
})

if (flags.isEnabled('newCheckout')) {
  // new checkout flow
}
```

That's it. Flags are booleans in your code. Ship it.

## Rules

Target flags to specific users, plans, or any context:

```ts
const flags = defineFlags({
  premiumFeature: {
    enabled: false,
    rules: [
      { match: { plan: 'pro' }, value: true },
      { match: { email: '*@yourcompany.com' }, value: true },
    ],
  },
})

flags.isEnabled('premiumFeature', { plan: 'pro' })              // true
flags.isEnabled('premiumFeature', { plan: 'free' })             // false
flags.isEnabled('premiumFeature', { email: 'you@yourcompany.com' }) // true
```

Rules support exact match, wildcard strings (`*`), and arrays (any-of). Multiple conditions in a single rule use AND logic. First matching rule wins.

## Percentage rollout

Roll out gradually. Uses a deterministic hash so each user sees a stable result:

```ts
const flags = defineFlags({
  newUI: {
    enabled: false,
    percentage: 25, // 25% of users
  },
})

flags.isEnabled('newUI', { userId: 'user_123' }) // consistent per user
```

## Environment variable overrides

Override any flag via env vars without touching code:

```
LITFLAG_NEW_CHECKOUT=false
LITFLAG_BETA_SEARCH=true
```

Env vars take highest priority — they override config, rules, and runtime overrides. Supports `true`/`false` and `1`/`0`.

## React

```tsx
import { FlagProvider, useFlag } from 'litflag/react'

// Wrap your app
<FlagProvider flags={flags} context={{ plan: user.plan }}>
  <App />
</FlagProvider>

// In any component
function Checkout() {
  const showNew = useFlag('newCheckout')
  return showNew ? <NewCheckout /> : <OldCheckout />
}
```

`useFlags()` returns all flags as a `Record<string, boolean>`.

## Next.js middleware

Gate routes behind flags:

```ts
// middleware.ts
import { withFlags } from 'litflag/next'
import { flags } from './flags'

export const middleware = withFlags(flags, {
  '/beta/*': 'betaSearch',
  '/new-checkout': 'newCheckout',
})
```

If the flag is off, the user gets redirected. Customize the behavior:

```ts
export const middleware = withFlags(flags, routes, {
  redirectTo: '/waitlist',
  getContext: (req) => ({
    plan: req.cookies.get('plan')?.value || 'free',
  }),
})
```

In development, override flags via URL: `?flags=betaSearch:true,newCheckout:false`

## Runtime overrides

Flip flags at runtime for testing, admin panels, etc.:

```ts
flags.override('newCheckout', true)
flags.isEnabled('newCheckout') // true

flags.clearOverrides()
```

## Get all flags

```ts
flags.getAll()                 // { newCheckout: true, betaSearch: false }
flags.getAll({ plan: 'pro' }) // evaluates rules with context
```

## TypeScript

Flag names autocomplete. Typos are type errors:

```ts
const flags = defineFlags({
  newCheckout: true,
  betaSearch: false,
})

flags.isEnabled('newCheckout') // ok
flags.isEnabled('typo')        // type error
```

## Priority order

1. Environment variables (`LITFLAG_*`)
2. Runtime overrides (`flags.override()`)
3. Rules (first matching rule wins)
4. Percentage rollout
5. Default value

## License

MIT
