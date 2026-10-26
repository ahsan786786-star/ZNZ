# ✨ ROUND 14 — FINAL (sab kuch ek jagah)

Ye **aakhri pakage** hai. Is mein pichhli saari settings + aap ki nayi 5 khwahishaat hain.
Do tareeqe neeche hain: **(A)** sirf update lagayein (5 files) ya **(B)** poora naya folder GitHub par daalein.

---

## 1) Is build mein kya naya / theek hua

| # | Aap ki khwahish | Kya kiya gaya |
|---|---|---|
| 1 | **Welcome ke baad wale page (posters, collections, dresses) ke background mein halke bubbles** | Naya **background canvas** bana jo content ke **peeche** (z-index 0) chalta hai. Poster, box, dress, likhai — sab us ke **oopar** hain, is liye bubbles kabhi kisi tasveer ya box par nahi aate. Sirf khali background mein nazar aate hain. |
| 2 | **Bubbles / stars alag option, owner ya admin jo chahe set kare** | Owner: **Layout & motion ▸ Storefront background — bubbles / stars**. Admin: **Home Sections ▸ Background bubbles / stars**. Options: **Kuch nahi / Bubbles / Stars / Dono**, sath **kitne** (6–20 behtar), **raftaar**, **chamak (opacity)**. Default: 16 bubbles, halki chamak. |
| 3 | **12–13 layout style theek kaam karein** | Purana bug mila: card effect **sirf tab** lagta tha jab customer khud switcher badalta tha; owner ki setting sirf entrance button par lagti thi. Ab: har dress/collection card par **owner ka chuna hua effect** lagta hai (wakht ke sath stagger), aur page khulte hi chalta hai. **13 effects** test kiye: `fade, slide, zoom, cube, flip, coverflow, curl, bounce, accordion, parallax, morph, stack, rotate` — sab live chal rahe hain (har ek ka CSS animation confirm kiya). |
| 4 | **Client page se layout ka option hata dein** | Customer-facing switcher (Circular / Grid + transition dropdown) **hata diya** gaya — home aur collection page dono se. Ab layout/effect **sirf owner/admin** tay karte hain, client ko sirf khoobsurat nateeja dikhta hai. (Owner: Layout & motion; Admin: Home Sections.) |
| 5 | **Kisi bhi jpg/png ki tasveer easily lage aur quality ke sath dikhe** | Har upload **JPG, JPEG, PNG, WebP, AVIF, GIF, TIFF** accept karta hai (phone ki photo bhi, rotation khud theek). Save hota hai **4K tak** (poster/background 3840 px, dress 3200, collection 3000) **WebP quality 92** + halki **sharpness/colour enhancement** (koi artificial look nahi), sath `-md` (1600 px) aur `-sm` (640 px) twins — phone tez, banner sharp. |
| 6 | **Tasveer na dikhne wala glitch** | (a) missing image ab **404** deti hai, HTML nahi; (b) har `<img>` khud full-size par fallback karta hai; (c) pehle upload hui tasveeron ke missing sizes app **boot par khud** bana deti hai. |
| 7 | **Collection tabs ki animation** | Collection boxes: ek ek kar ke fade+slide in, hover par **gold shimmer**, soft **zoom**, dheema **gold border** — sirf transform/opacity (slow phone par bhi smooth), “reduced motion” walon ke liye khud band. |
| 8 | **Owner password sirf owner panel se; admin password owner ki ijazat se** | Owner ID/password/PIN **sirf** `/owner ▸ Owner security`. Admin login **sirf owner** badal sakta hai (`Admin control` + **owner password**); admin khud tabhi badal sakta hai jab owner *Own username / password / PIN change* tick kare. Change par wo account sign-out, owner sign-in rehta hai. Purana hard-coded master password **hata diya**. |
| 9 | **Sab kuch panel se handle ho** | Posters, collections, dresses/photos/prices/videos, notice, wheel/grid, popup, wallpaper, ads, inbox, SEO, terms, about, branches, badge, backup, admin rights — sab panel se. |

---

## 2) Tareeqa A — sirf update (5 files, 3 minute)

`UPDATE-R14-FILES` folder se ye 5 files apne repo folder `D:\ZNZ\New folder\ZNZ` mein replace karein:

```
server.js                      → repo root
lib\auth.js                    → repo ke lib
public\assets\js\app.js        → repo ke public\assets\js
public\assets\js\owner.js      → repo ke public\assets\js
public\assets\css\app.css      → repo ke public\assets\css
```
(agar admin panel wala naya card bhi chahiye: `public\assets\js\admin.js` bhi replace kar dein — 6th file)

Phir: GitHub Desktop → Summary `round 14 final` → **Commit to main** → (Pull aaye to pehle Pull) → **Push origin**
→ Render ▸ **ZNZ** ▸ **Manual Deploy ▸ Deploy latest commit** → Live hone par site par **Ctrl + Shift + R**

## 3) Tareeqa B — poora naya folder (safe tareeqa)

Is folder ko jaisa hai waisa GitHub par daal dein (purana repo delete karke naya bana lein) — tafseel `DELETE-KAR-KE-NAYA-SHURU.md`.
Ye tareeqa is liye behtar hai ke `.gz`, `node_modules` jaise purane bekaar files bhi saaf ho jate hain.

---

## 4) Deploy ke baad 5 cheezein check karein

| Kahan | Kya dikhna chahiye |
|---|---|
| `https://znz.onrender.com/api/version` | `"version":"8.1.0"` · `"build":"2026-10-26-r14"` · `"storage":"github"` · `"keepAwake":true` |
| Site kholein → **Ctrl + Shift + R** | Welcome page → tap → store; background mein halke bubbles (kisi box ke ooper nahi) |
| Collection boxes | halki animation + hover par shimmer/zoom |
| `/admin` | login `admin` / `znz2026` / `2026` → **Home Sections** mein naya card “Background bubbles / stars” |
| `/owner` | login `1234567890123` / `admin123` / `998877` → **Layout & motion** mein naya card, aur **Dashboard** mein **Site status** (version 8.1.0) |

---

## 5) Ek dafa ka setup (10 minute, phir hamesha ke liye)

1. **Owner password**: `/owner ▸ Owner security` → naya ID/password/PIN → Save → dobara login
2. **Admin login**: `/owner ▸ Admin control` → naya username/password/PIN + **apna owner password** → Update admin login
3. **Background**: `/owner ▸ Layout & motion ▸ Storefront background` → Bubbles / Stars / Dono, kitne 16, halki chamak → Save
4. **Layout + effect**: usi tab mein Layout (grid ya circular) + **Card / grid transition** (13 mein se) → Save
5. **Badge**: `/owner ▸ Live visitors` → on + “kam se kam kitne dikhein” (misaal 7) → Save
6. **Backup**: `/owner ▸ Backup & restore` → *Download backup (.zip)* (mahine mein ek dafa)
7. **Auto-deploy**: Render ▸ ZNZ ▸ Settings ▸ Build & Deploy ▸ **Auto-Deploy = Yes**
8. **Google**: `GOOGLE-PAR-KAISE-AYEIN.md` → Search Console mein `https://znz.onrender.com/sitemap.xml`

---

## 6) QA jo main ne chalaya (sab pass)

- `npm ci` + boot → `200`, `/api/version` → **8.1.0 / r14**
- 3000×2000 **JPG** upload → `3000×2000` save, `-md` + `-sm` dono `200 image/webp`
- purani (sirf big file wali) tasveer → boot par `-md`/`-sm` khud ban gaye
- ghayab tasveer → `404 text/plain` (HTML nahi)
- 13 transitions: har ek ka CSS animation `trFade … trRot` — **13/13 chal rahe**
- client page par **0** layout switcher
- `/`, `/admin`, `/owner`, `/look`, `/c/barat`, `/d/barat/zohra`, `/sitemap.xml`, `/robots.txt` → **200**
- admin → owner password = **403**; owner → admin reset = **ok** (admin sign-out, owner sign-in)
- background canvas: `z-index 0`, `#app` `z-index 1` → bubbles kabhi box/poster ke ooper nahi
- mobile (390×844) screenshot: collections 2×2, animation + badge theek
- owner panel: naya card maujood; admin panel: naya card maujood, save kar ke bootstrap mein setting badalti hai

---

## 7) Masle aur hal

| Jo dikhe | Hal |
|---|---|
| Bubbles nazar nahi aate | Owner ▸ Layout & motion ▸ mode “Bubbles/Stars/Dono”, count 16, opacity Normal → Save; phir **Ctrl + Shift + R** |
| Bubbles bohat zyada | count 8–10 kar dein |
| Admin login na chale | `/owner ▸ Admin control` se naya admin password set karein |
| Purana code chal raha | Render ▸ Manual Deploy ▸ Deploy latest commit + browser cache clear |
| Tasveer phir bhi tooti | `/api/version` dekh kar bata dein version 8.1.0 hai ya nahi |
| Build fail `sharp` | `NODE_VERSION=20.11.1` ke baad Manual Deploy |

---

## 8) Ek line mein

**5 (ya 6) files replace → Commit → Push → Manual Deploy → Ctrl + Shift + R.**
Us ke baad: owner password, admin login, background bubbles, layout + effect, badge, backup — bas.
Aage koi file badalne ki zaroorat nahi. 🥂
