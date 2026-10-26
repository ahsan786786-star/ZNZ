# Z&Z — Buy Luxury Bridals & Formals

A complete, ultra-fast bridal couture website with **three faces**:

| Face | URL | Who it is for |
|---|---|---|
| **Storefront** | `http://localhost:3000` | Your customers |
| **Admin panel** | `http://localhost:3000/admin` | Your team (rights granted by the owner) |
| **Owner panel** | `http://localhost:3000/owner` | You — higher than admin, sees and controls everything |

---

## What is new in this build (round 13 — final)

1. **Every picture is stored at full quality.** Anything uploaded from the admin **or** owner panel
   is saved up to **4K wide** (posters/backgrounds 3840 px, dresses 3200 px, collections 3000 px) at
   WebP quality 92, and two lighter twins are generated automatically (`-md` 1600 px, `-sm` 640 px) so
   phones still load fast. Pictures uploaded earlier get their missing sizes built at boot — you do
   nothing.
2. **No more broken picture icons.** A missing image now answers `404` instead of the HTML page, and
   every `<img>` falls back to the full-size file if a lighter twin is unavailable. Uploaded posters
   show up on the first load, on desktop and phone.
3. **Login rules locked down.** Owner ID / password / PIN can only be changed from `/owner`
   (*Owner security*). The admin login can be changed only by the owner (*Admin control*, proving
   identity with the **owner** password); the admin can change its own login only when the owner
   ticks *Own username / password / PIN change*. Any change signs the affected account out
   immediately — the owner stays signed in when resetting the admin.
   The old hard-coded master password was removed, so an old build's password can never open the panel.
4. **Gentle animation on the collection boxes** — they fade/slide in one by one, a slow gold shimmer
   crosses the picture on hover, the photo zooms softly and a slow gold border breathes. Transform and
   opacity only, and it switches off automatically for visitors who prefer reduced motion.
5. **This package ships with the documented logins** (`admin / znz2026 / 2026` and
   `1234567890123 / admin123 / 998877`) — change them on day one.

## What was new in round 8

1. **Automatic background removal for every dress** — as soon as a dress or album photo is uploaded
   the server cuts the model / hanger / studio away and saves a transparent version next to it
   (`<name>-cut.webp`). The mannequin's hands are erased and filled with the fabric itself, thin
   hangers and props are dropped, and sheer skirts keep their true outline. All 20 starter dresses
   were re-cut with the same engine, so the Try-On Studio always uses clean, background-free pieces.
2. **Try-On Studio is now fully professional English** — instructions, buttons, toasts, sleeve advice
   and the "choose a design" panel. Admin and owner panels stay Roman Urdu as you asked.
3. **Dresses in the studio are grouped by collection** — a row of collection chips (Barat / Walima /
   Mehndi / Party) sits above the design grid, and the name line shows *dress · price · sleeved /
   sleeveless*.
4. **Sleeve advice** — when her photo shows covered arms and she picks a sleeveless design, the studio
   says so before she saves the look, in plain English.
5. **The studio folds the instruction wall away** once her photo is in, so the picture and the dress list
   fill the screen on laptop and mobile.
6. **A tighter, truer fit** — the dress takes her shoulder / waist / hip widths again (tuned closer to the
   body), her studio floor and cast shadow no longer travel with her, and stray wall patches are removed,
   so the finished picture reads as *her* in the dress.
7. **13 effects everywhere** — circular wheel / grid **plus** Fade, Slide, Zoom, Cube, Card flip,
   Cover flow, Page curl, Bounce, Accordion, Parallax, Morphing, Stacked cards and Slow spin can be
   chosen on the collection page, on the home "Most Loved" rail, in the admin panel and in the owner
   panel. Nothing on the admin page mentions the owner panel any more.
8. **Bigger entrance logo** — the 3D logo is about 30 % larger on every screen size while the
   "Welcome" script and `Z&Z` still fit without overflow.

---

## 0. FREE live karna (GitHub + Render)

Poori click-by-click guide: **`SHURU-KAREIN-LIVE.md`** (GitHub account + Render free + GitHub storage
taake dresses/prices/tasveerein restart ke baad bhi mehfooz rahein).
Technical version: **`DEPLOY-FREE.md`**.
GitHub ka "Access is temporarily restricted" ya koi aur rukawat? **`GITHUB-BLOCK-HAL.md`**.
Files GitHub par kaise chadhayein: **`GITHUB-UPLOAD-KAISE-KAREIN.md`**.
Site ka address, Google par aana aur custom domain: **`GOOGLE-PAR-KAISE-AYEIN.md`**.
Site ko jagta rakhna + "N browsing now" badge: **`AUTO-LIVE-RAHE.md`**.
GitHub par publish karne ke baad Render par live karna: **`RENDER-AB-KYA-KAREIN.md`**.

---

## 1. Start the website

**Windows** — double click `START-WINDOWS.bat`
**Mac** — double click `START-MAC.command`

The first run installs two small packages (needs Node.js LTS from <https://nodejs.org>) and then opens
`http://localhost:3000` in your browser.

> Always open **`localhost:3000`**, never `0.0.0.0:3000`.

---

## 2. Logins

**Owner (you) — full power**

| Field | Value |
|---|---|
| Owner ID | `1234567890123` |
| Password | `admin123` |
| PIN | `998877` |

**Admin (your team) — separate door at `/admin`**

| Field | Value |
|---|---|
| Username | `admin` |
| Password | `znz2026` |
| PIN | `2026` |

Please change both sets of details on the first day (owner: *Owner security* tab; admin: *Admin control* tab).

The three faces are **fully separate**: the customer needs no login at all, `/admin` only accepts the
admin key, and `/owner` only accepts the owner key. Using owner details at `/admin` (or the other way
round) is refused with a hint pointing to the right door.

Only the **owner** can change the admin's username, password, PIN and permissions
(*Admin control* → your owner password confirms it). The admin can only change its own details if the
owner has granted *Own username / password / PIN change*. The owner's own login can only be changed
from *Owner security* — never from the admin panel.

> Forgot the admin password? Open `/owner` → **Admin control** → set a new one with your owner
> password. No terminal, no rebuild.

### Live visitors
*Owner panel ▸ Live visitors* shows, in real time (refresh every 6 s), how many people are on the site
right now, which page each one is reading, whether they are on a phone or a desktop, and how long they
have been there. “Active” means seen in the last 90 seconds. The same count appears as a tile on the
owner dashboard.

---

## 3. What the owner can do (and nobody else)

- Reset the admin login at any time.
- Tick / untick every section the admin may use:
  posters, collections, dresses & prices, home sections, check-your-look, contact & social,
  about / terms / SEO, customer inbox, own security, entrance wallpapers.
- Decide whether the admin may see **client try-on photos**.
- Pick one of **38 entrance wallpapers** — creams, noirs, emerald, burgundy, diamond-cut and animated
  silk / aurora / bokeh templates — or upload your own.
- Control the logo motion (continuous Y-axis turn — always one direction), card transitions and the
  layout of every collection page.
- See every customer: orders, VIP leads, complaints, ratings and client photos.

Everything in the admin panel also exists in the owner panel, so you never need two tabs.

---

## 4. Day-to-day work

**Collections** — *Collections* tab. Name, description, **album cover uploaded by you** (never taken from
a dress photo), page banner, optional collection **video**, and a visible/hidden switch.

**Dresses** — *Dresses & prices* tab → pick the collection → *Add dress*.
- Up to 30 photos per dress; the first photo is the cover, arrows reorder them.
- Leave the price empty and the website shows *“Contact for pricing”*.
- Attach a short **MP4 / WebM clip** (40 MB max) — it appears under the gallery on the dress page.

**Posters** — drag several images into the drop area; they rotate every 3 seconds.

**Check Your Look** — customers upload one full-body photo in a blooming-garden scene, pick any dress,
and slide it over themselves. Their photo is processed in the browser, saved privately in
`public/uploads/looks/`, and only appears in the owner panel (and the admin panel only if you allow it).

**Rates & complaints** — private. They appear in the inbox, never on the public site.

**Advertisements** — *Owner panel ▸ Advertisements*. Add a poster (or a short MP4/WebM) with a headline,
a line of copy, a button and a link (a collection page, WhatsApp, any URL), choose where it appears
(top strip, middle of the home page, floating corner card, sticky bottom bar), schedule it with start /
end dates and pause it whenever you like. The master switch hides every advert at once. Under
*Admin control ▸ Advertisements* you decide whether the admin may touch adverts — **off by default**.

---

## 5. Look & feel

- **Gold** — rich champagne gold taken from your reference logo, with real 3D thickness.
  The logo turns smoothly in one direction, like a watch hand, never to-and-fro.
- **Welcome screen** — “Welcome” in script above the logo, then **Z&Z** in large gold below it, then
  *Luxury Bridals & Formals* in script. Top-left currency (live PKR rates), top-right day / night icon.
- **Bubbles** — glass bubbles with a mini logo inside, 38 by default, and they live **only on the two
  sides of the logo** (left and right bands, never through the middle), in random order — no sequence.
  If one drifts towards the centre it is gently pushed back, so the logo and the writing always win the shine.
- **Bubble speed & quality** — *Owner panel ▸ Layout & motion ▸ Bubbles & glitter*. Speed runs from
  slow-dreamy to fast; Quality (low / medium / high) decides how sharp the glass and the sparkles are
  and how many particles the phone has to draw — pick *low* for older phones, *high* for the sharpest
  look.
- **Glitter on burst** — **every bubble bursts where it is**, and from that exact spot its inside
  **explodes into fine golden glitter** (a compact little firework, sized to the bubble itself — not a
  big cloud in the middle of the screen): hair-thin specks shooting out in rays, a small hot golden
  flash, and a dense dust core right on the bubble. Then the dust loses its speed,
  gravity takes over, and it **rains down as fine specks**, reaching the lower part of the screen where
  it settles and sparkles for another 1–3 seconds before dissolving. Total life about 5–6 seconds, and
  nothing ever falls off the bottom of the screen. Wherever the specks pass over the logo or the text
  they turn almost see-through, so the writing always stays crisp.
  **Fine specks per burst** (100–600), **how heavy it falls**, **speed** and **quality** are all yours to
  tune in *Layout & motion ▸ Bubbles & glitter* — or switch the glitter off entirely.
  A picture guide is inside `preview/glitter-reference-guide.png`.
  All of this lives **only on the welcome screen**.
- **Logo turn** — matched to the reference clip: one smooth constant-speed revolution (9 seconds by
  default), and the picture flips at the exact edge-on moments so the logo is **always seen from the
  front** — never a mirror image, never left upside down.
- **Layouts** — circular wheel *or* grid. The wheel supports an arc, a full circle and the
  **half-circle-on-both-sides** style. **13 effects** — fade, slide, zoom, cube, card flip, cover flow,
  page curl, bounce, accordion, parallax, morphing, stacked cards and slow spin — are offered **everywhere**
  a circular / grid choice exists: the collection page, the home "Most Loved" rail, the admin panel and the
  owner panel.
- **Night mode** and the currency converter live in the header on every page.

---

## 6. Try-On Studio (client-facing text is English)

Open **Menu ▸ Try-On Studio** (`/look`). Everything runs **inside the customer's own browser** — fast,
free, private: no AI subscription and no server wait.

**Step 1 — instructions, in professional English**

Three photo examples are shown before she uploads anything:

| | Example | Verdict |
|---|---|---|
| ✓ | Full length, no dupatta | **Correct photo** |
| ✗ | Photo with a dupatta | **Not suitable** |
| ✗ | Face only | **Not suitable** |

Below them: whole body head to feet, face clearly visible, no dupatta / shawl, stand against a plain bright
wall, then the **Choose your photo** button. There is no "remove dupatta" tool — the photo comes in clean.

**Step 2 — after the upload**

1. **The wall behind her is cut automatically** so a garden background can be placed behind her.
2. **The dress list is grouped by collection** — chips for Barat / Walima / Mehndi / Party, and the line
   under the grid shows *dress · price · sleeved / sleeveless design*.
3. **Auto-fit** — the dress she taps is fitted to her own shoulders, waist, hips and hem, measured from
   her photo (head-anchored, 7.5-head proportions). She has to adjust nothing.
4. **The design itself never changes** — every dress is pre-cut with the server engine
   (`public/assets/img/dresses/<name>-cut.webp`), the mannequin's body and hands are gone, so the fabric,
   embroidery, dupatta drape and flare are exactly the real piece.
5. **Customise (optional)** — *Customise* opens Length / Width / Flare / Up-down sliders, and
   *Back to auto-fit* restores the perfect fit.
6. **Sleeve advice** — if her arms look covered in her photo and the design she picks is sleeveless, the
   studio tells her in plain English that her previous outfit's sleeves would show, and suggests a photo
   with bare arms.
7. **Three backgrounds** under the picture (green lawn default, rose garden, golden hour) — the owner or a
   granted admin can upload and delete more in *Client photos*.
8. **Save and download** — *Save to my gallery* keeps the look on her own device, the gold **4K / 8K** badge
   over the picture downloads a print-quality JPEG.

The instruction wall folds itself away once her photo is loaded, so the picture and the design list fill the
screen on a laptop and on a mobile — the photo is never cut off.

A saved look appears in the admin panel under **Client photos** (and in the owner panel), with the dress
name and the client's own picture.

**How a new dress gets its cut-out:** upload it in the admin panel as usual. The server
(`makeCutout()` in `server.js`) shrinks it, floods the plain studio background from all four borders,
keeps the largest island, removes the mannequin's hands and any bare-skin patch by diffusing the
surrounding fabric into it, drops 1–2 px hanger wires, and keeps sheer skirts by enforcing a monotone
silhouette. The transparent file is written next to the original as `<name>-cut.webp` and is served to the
studio automatically — no extra step, no AI account.

If a photo is impossible to cut cleanly (for example an ivory gown on a white studio wall where the fabric
and the wall have the same colour), the server refuses to store a half-eaten cut-out and the studio falls
back to keying that one photo on the client's own device, so the client always sees the whole dress.

## 7. Speed & SEO

- Server-side rendered heads with meta, Open Graph, Twitter cards and JSON-LD per page.
- `sitemap.xml`, `robots.txt`, web app manifest, **self-hosted fonts** (no Google Fonts request).
- **Two-size images** — every dress, cover and poster has a 640 px `-md` file plus the big one, served
  with `srcset`, so a phone downloads about a third of the data. Dress photos are WebP.
- **Cache that never goes stale** — one version stamp (`?v=…`) on every CSS/JS/font link means repeat
  visitors load them from their own device for a year, while a new upload is picked up instantly.
- **Instant second visit** — the catalogue is remembered on the device, so the shop paints at once and
  refreshes quietly in the background (it even opens the last saved catalogue when the internet drops).
- Gzip on text, `content-visibility` for below-the-fold sections, lazy loading + `fetchpriority` on the
  first poster only.
- Every page answers in a few milliseconds; the storefront stays under ~110 KB on first paint, and the
  Try-On Studio screens use no network at all until a photo is saved.

---

## 8. Files that matter

| Path | What it is |
|---|---|
| `server.js` | Express server: pages, public API, admin API, owner API, uploads |
| `lib/store.js` | Tiny JSON store for `data/db.json` (atomic writes) |
| `lib/auth.js` | Password hashing, 12-hour sessions, owner/admin roles |
| `data/db.json` | **All** content and customer data — back this file up |
| `public/assets/img/` | Logo, posters, collection covers, dress photos, `look/` try-on backgrounds |
| `public/uploads/` | Runtime uploads (dress photos, collection covers, videos, client photos) |
| `public/assets/js/tryon.js` | The whole Try-On Studio (photo cut-out, body guides, dress fitting, 4K/8K export) |
| `seed.js` | Re-seeds a fresh `db.json` |

Back up weekly: copy `/data` and `/public/uploads` somewhere safe.

---

## 9. Troubleshooting

| Problem | Fix |
|---|---|
| `Cannot find module 'express'` | Run `npm install` once inside the folder |
| Page does not open | Use `localhost:3000`, not `0.0.0.0:3000` |
| Port already in use | Close the other window, or change `PORT` in `server.js` |
| Login rejected | Owner `1234567890123 / admin123 / 998877` · Admin `admin / znz2026 / 2026` |
| Put the folder in `D:\ZNZ` | Avoid OneDrive paths — Node cannot watch them reliably |
| Videos do not upload | Use MP4 (H.264) or WebM, under 40 MB |
| The dress looks too narrow / wide | Step 3 ▸ drag the shoulder / hip dots outward, then use *Skirt flare* |
| Cut-out left the person ghostly | Step 2 ▸ lower *Sensitivity*, or press *Keep my photo* |
| 8K download slow on a phone | Use 4K — phones are switched to 4K automatically |
