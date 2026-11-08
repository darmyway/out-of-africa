# Out of Africa

Marketplace website for original work by African artists, with a private dashboard ("Studio") for managing everything.

- **Website:** `public/` (static pages, Tailwind CSS, vanilla JS)
- **Dashboard:** `public/admin/` → open `/admin` on the live site
- **API:** `functions/` (Cloudflare Pages Functions)
- **Data:** Cloudflare D1 database (`DB`) · **Photos:** Workers KV (`MEDIA`)

## Everyday use

Everything is edited from the dashboard at `https://<your-site>/admin`:

| Section | What you do there |
|---|---|
| Overview | New messages, orders to quote, quick actions, setup checklist |
| Artworks | Add or edit works, upload photos, set price and status, feature on homepage, reorder |
| Artists | Profiles, portraits, highlights, biography, commissions on/off |
| Inbox | Every enquiry, commission request, artist application, order and newsletter signup |
| Orders | Turn checkout requests into quotes (prices + shipping + payment link), send the private quote link, track to delivery |
| Photos | Photo library |
| Settings | Contact details, announcement bar, email alerts, artist terms, homepage text and images, open call spaces |

Tip: on your phone, open `/admin` and choose "Add to Home Screen" to use it like an app.

## Cloudflare setup (once)

Pages project connected to this GitHub repo:

- Build command: *(none)* · Build output directory: `public`
- Settings → Bindings:
  - D1 database binding **`DB`** → database `out-of-africa-db`
  - KV namespace binding **`MEDIA`** → namespace `out-of-africa-media`
- Settings → Variables and secrets: **`ADMIN_PASSWORD`** (type: Secret) = your dashboard password

Tables are created automatically on first visit, and the current catalogue (from `functions/_seed.js`) is imported once.

## Changing the design

Styles are compiled Tailwind. After changing classes in `public/`, run:

```
npx tailwindcss@3 -c design/tailwind.config.js -i design/input.css -o public/assets/css/site.css --minify
```

## Local testing

```
echo 'ADMIN_PASSWORD="test"' > .dev.vars
npx wrangler pages dev
```
