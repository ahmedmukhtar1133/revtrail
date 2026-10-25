import type { Site } from './api';

/**
 * A copy-paste prompt for the site owner's coding AI (Claude Code, Cursor, Copilot…),
 * filled with this site's real values so the AI can install tracking and revenue attribution itself.
 * The API key and webhook secret are deliberately left out: the integration doesn't need them in code.
 */
export function buildAiPrompt(site: Site, origin: string): string {
  const script = `<script defer data-website-id="${site.id}" src="${origin}/js/script.js"></script>`;
  return `You are setting up RevTrail analytics + revenue attribution in this codebase. RevTrail is my self-hosted analytics (like DataFast / Plausible). Do the work directly in the code. Only ask me questions about things you cannot find out by reading the codebase, and ask them all together, up front, before making changes.

## My RevTrail values (already correct — use them as-is)
- Dashboard / API host: ${origin}
- Website ID: ${site.id}
- Tracked domain: ${site.domain} (all subdomains such as app.${site.domain} count as the same site)
- Revenue currency: ${site.currency}
- Script tag:
  ${script}

## Task 1 — Install the tracking script on every page
- Find how this project renders the HTML <head> (e.g. Next.js app/layout.tsx or pages/_document.tsx, Vite/CRA index.html, Astro/Nuxt/SvelteKit/Remix root layout, plain HTML files, WordPress header.php…) and add the script tag so it loads on EVERY page, including the logged-in app and any subdomains that live in this repo.
- Next.js: use next/script: <Script defer data-website-id="${site.id}" src="${origin}/js/script.js" strategy="afterInteractive" />
- Keep the exact attributes. Load it once only. Single-page-app navigation is tracked automatically; do not add manual pageview calls.
- If the project has a Content-Security-Policy, allow ${origin} in script-src and connect-src.

## Task 2: Revenue attribution with Polar or Dodo Payments (most important)
RevTrail sets no cookies. The server recognises each visitor and the script keeps the visitor id in memory; window.revtrail.attribution() returns { rt_visitor_id } once the first pageview has been recorded. Every payment must carry that id so RevTrail knows which visitor (and therefore which tweet / article / Google page) made the money.
- Search the codebase for checkout code: "polar.sh", "@polar-sh", "checkouts.create", "dodopayments", "DodoPayments", "checkoutSessions.create", "payments.create", "subscriptions.create", "checkout.dodopayments.com", "/buy/".
- Static checkout links in the HTML (<a href="https://buy.polar.sh/..."> or <a href="https://checkout.dodopayments.com/buy/...">) need no change: the script tags them automatically (Polar: ?reference_id=<id>, Dodo: ?metadata_rt_visitor_id=<id>). If code redirects to a checkout link with JavaScript (window.location = ...), append the same param yourself using window.revtrail?.attribution?.().rt_visitor_id.
- Where a checkout is created on the SERVER, send the id from the browser in the request that starts the checkout (read it with window.revtrail?.attribution?.()), then MERGE it into the existing metadata (never drop existing metadata keys):
    Polar: metadata: { ...existingMetadata, reference_id: body.rt_visitor_id ?? '' }
    Dodo:  metadata: { ...existingMetadata, rt_visitor_id: body.rt_visitor_id ?? '' }
- Make sure every checkout returns to a page on this site that loads the RevTrail script, with the payment reference in the URL: Polar success_url 'https://${site.domain}/thanks?checkout_id={CHECKOUT_ID}', Dodo return_url 'https://${site.domain}/thanks' (Dodo appends ?payment_id=...). RevTrail uses that visit to link the payment to the visitor even if metadata is lost. Keep those query params on the URL (don't strip them before the page loads).
- Do NOT touch payment webhooks in this codebase for RevTrail. I connect them myself in the Polar or Dodo dashboard (Polar: ${origin}/api/webhooks/polar/${site.id}, Dodo: ${origin}/api/webhooks/dodo/${site.id}).

## Task 3 — Identify logged-in users
Right after a successful login/signup (and on app load when a user session exists), call:
  window.revtrail?.('identify', { user_id: user.id, email: user.email, name: user.name })
This links anonymous visits to the person, and is a fallback for attributing payments by email.

## Task 4 — Track key buttons as goals
Add data attributes to the most important calls-to-action (no JS needed), using short snake_case names:
  <button data-rt-goal="signup_click">  ·  data-rt-goal="start_trial"  ·  data-rt-goal="pricing_cta"  ·  data-rt-goal="checkout_click"
Optional details: data-rt-goal-plan="pro". From code: window.revtrail?.('goal', 'signup_completed', { plan: 'pro' }).
Track at least: the main signup/get-started button(s), pricing-page plan buttons, and the checkout/buy button. Also fire window.revtrail?.('goal', 'signup_completed') after a successful signup.

## TypeScript
If the project uses TypeScript, add a global declaration so calls type-check:
  declare global { interface Window { revtrail?: ((cmd: 'goal' | 'identify' | 'pageview', a?: any, b?: any) => void) & { attribution?: () => { rt_visitor_id?: string } } } }
Always call it with optional chaining (window.revtrail?.(...)) so pages never break if the script is blocked.

## Rules
- Make minimal, focused changes that match the existing code style. Don't refactor unrelated code.
- Don't hardcode secrets. None are needed for this setup.
- The script ignores localhost by default. To test locally add data-allow-localhost to the script tag temporarily (remove it before committing), or test on the deployed site.

## When you are done, reply with
1. A list of every file you changed and why.
2. Which checkout/payment code paths now send the visitor id (and any you could not find or were unsure about).
3. Which goals you added and where.
4. How I can verify: open the site, in DevTools → Network a POST to ${origin}/api/event returns 202, and the visit appears in my RevTrail dashboard within seconds.`;
}
