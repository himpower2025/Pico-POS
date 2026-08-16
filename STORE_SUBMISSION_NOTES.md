# Pico POS — App Store / Play Store Submission Notes

Drafted from what the app's code actually collects and does, as of this build. Store
questionnaire wording changes over time — cross-check against the live Play Console /
App Store Connect forms before submitting, don't just copy this blindly.

---

## What Pico POS actually sends where (source of truth for both forms below)

| Data | Where it goes | Why |
|---|---|---|
| Email address | Firebase Authentication (Google Cloud) | Sign-in |
| Store profile (name, location, currency, tax ID, settlement account) | Firestore (Google Cloud) | Core app functionality |
| Orders, menu, daily sales summaries | Firestore (Google Cloud) | Core app functionality |
| Aggregated sales numbers + menu item names (no customer personal data) | Google Gemini API | Optional AI business insights feature |
| Firebase Auth UID, subscription/purchase status | RevenueCat, Apple/Google | Subscription management |

Not present in this app: advertising SDKs, analytics/tracking SDKs, crash reporting SDKs.
Nothing is collected for advertising or cross-app tracking.

---

## Google Play — Data Safety form

**Does your app collect or share any required user data types?** Yes.

| Data type | Collected? | Shared? | Purpose |
|---|---|---|---|
| Email address | Yes | No | Account management, App functionality |
| Financial info — Purchase history | Yes | No¹ | App functionality (subscription status) |
| Financial info — Other (tax ID, settlement account) | Yes | No | App functionality |
| Device or other IDs | No | — | — |
| Location | No | — | — |
| App activity / analytics | No | — | — |

¹ Subscription status is synced with RevenueCat to manage your plan; Play Console's current
definitions determine whether a processor acting on your behalf counts as "sharing" —
check the in-console guidance for the current wording.

**Is all this data encrypted in transit?** Yes (HTTPS/TLS throughout).

**Can users request data deletion?** Yes — describe your process and point to the
`privacy.html` page's "Data Retention & Deletion" section (see below).

**Data safety section deletion-request link:** use the same Privacy Policy URL.

---

## Apple — App Privacy ("Nutrition Label")

| Category | Data type | Linked to identity? | Used for tracking? |
|---|---|---|---|
| Contact Info | Email Address | Yes | No |
| Financial Info | Purchase History | Yes | No |
| Identifiers | User ID | Yes | No |
| Usage Data | — | Not collected | — |
| Diagnostics | — | Not collected | — |

**Data Used to Track You:** None. Pico POS does not use IDFA and does not share data with
data brokers or ad networks — you can answer "No" to Apple's tracking (ATT) question and
skip the App Tracking Transparency prompt entirely.

---

## Privacy Policy / Terms URLs for the submission forms

Once deployed, use:
- Privacy Policy: `https://<your-vercel-domain>/privacy.html`
- Terms of Service: `https://<your-vercel-domain>/terms.html`

Both are now static pages under `public/` that don't require login to view — required by
both stores, since the same content living only inside the authenticated app isn't
reachable by reviewers or the store's own crawlers.

---

## App Review notes (both stores require a way in, since the app requires login)

**Recommended: create one reviewer account before submitting.**

The app already has a `demo` convention built in (`LoginView.tsx` — a first-time email
containing "demo" seeds a pre-filled sample store called "Blue Bottle Demo" with sample
tax/currency settings, so a reviewer immediately sees a populated dashboard instead of an
empty new account). Suggested reviewer credentials to set up yourself:

```
Email:    appreview-demo@<your-domain>
Password: <set a real password via Create Account tab>
```

**Suggested App Review notes text (adapt as needed):**

> Pico POS is point-of-sale software for cafes/restaurants. Reviewers can sign in with the
> demo account above (Sign In tab, not Create Account) to see a pre-populated store with
> sample menu items, orders, and a dashboard. Subscriptions are managed via in-app purchase
> (Monthly/Annual plans) under Settings > Subscription. No purchase is required to explore
> the core POS, Kitchen, and Dashboard screens.

---

## Known limitations worth disclosing to reviewers if asked

- Bluetooth thermal-printer pairing is Android/desktop-only (iOS uses the standard system
  print sheet instead) — this is a genuine platform limitation (Apple's WebKit doesn't
  support Web Bluetooth), not a bug, but reviewers occasionally flag missing/greyed-out
  buttons, so the notes above proactively explain it.
