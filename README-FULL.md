# Z&Z — Luxury Bridals & Formals
## Website + Private Admin Panel · Handover Guide

---

### 1. Kya bana hai (What you have)

| | |
|---|---|
| **Customer website** | Welcome entrance screen → Home (notice bar, hero posters, collections, most-loved wheel, terms, ratings/complaints, about, contact, socials) → Collection page → Dress page → Bag / Checkout |
| **Admin panel** | `/admin` — login with **username + password + 4-digit PIN**. Posters, collections, dresses & prices, colours, contact/socials, terms, about, branches, SEO, inbox, credentials — all editable. |
| **Speed** | Zero frameworks, zero external CDN. First paint < 0.1 s on a local server, ~100 KB total transfer, all images WebP + auto thumbnails, gzip on every text file, self-hosted fonts. |
| **Responsive** | One layout system tuned for 360 px phones → 4K desktops. Tested on 390×844 (mobile) and 1280/1600 (desktop). |
| **Night mode** | Moon icon in the header. Backgrounds become deep black; product photos are brightened so colours still pop. |
| **Currency** | PKR / USD / SAR / AED / GBP switcher (rates editable). Enter a price once in PKR — customers see it in their currency. |

**Files:** everything lives in the `site/` folder of this workspace (see section 7).

---

### 2. Chalane ka tareeqa (Run it)

```bash
cd site
npm install        # 3 packages: express, multer, sharp
npm start          # → http://localhost:3000
```

Admin panel: **http://localhost:3000/admin**

| Field | Default value |
|---|---|
| Username | `admin` |
| Password | `ZnZ@2026` |
| PIN | `2026` |

> ⚠️ **Pehla kaam:** Admin → **Security** → teeno (username, password, 4-digit PIN) apne zaati details par set karein.
> Wahan current password maanga jayega, phir naye details save hone par aap logout ho jayenge aur naye details se login hoga.
>
> Apne details seed se set karna ho to:
> `ADMIN_USER=zain ADMIN_PASS='StrongPass123' ADMIN_PIN=4821 npm run reset`

Agar start karte waqt live preview band ho jaye: server dobara `npm start` se chal jayega.

---

### 3. Customer journey (jo customer dekhta hai)

1. **Welcome entrance screen** — crystal-gold background, `Welcome` in gold script, the 3D **Z&Z logo rotating along its Y axis**, then `Z&Z` and `Luxury Bridals & Formals`.
   * Glass bubbles appear one by one over ~3.5 s, drift randomly, shimmer, then **burst** and new ones keep forming — an endless, stutter-free loop.
   * Jab bubble logo ya text ke upar aata hai to wo madham ho jata hai taake logo ki shine barqarar rahe. Bubble ko tap karke pop bhi kar sakte hain.
   * Screen par kahin bhi tap karein → store khul jata hai. (Returning visitor ~1 second baad khud enter ho jata hai; kisi bhi deep link par bhi welcome screen pehle aata hai.)
2. **Home** — notice/offer bar → hero posters (auto-rotate + swipe + centre-highlighted 3-thumbnail strip) → collection boxes → most-loved circular wheel → terms box → rates & complaint → about + branches → contact + socials. Floating WhatsApp button har page par.
3. **Valuable customer popup** — entry ke thodi der baad chhota card aata hai (email ya WhatsApp number). Kisi bhi aur jagah tap karne ya ✕ se band, 7 din tak dobara nahi aayega. Jo number/email submit ho wo **Admin → Inbox → Valuable customers** mein aa jata hai (wahan se “Copy all contacts” karke WhatsApp group mein paste kar sakte hain).
4. **Collection page** — banner + dresses ek **circular wheel** mein (swipe / arrows / dots) ya grid mein; customer khud switch kar sakta hai.
5. **Dress page** — saari photos (swipe, arrows, thumbnails), name, price ya *“Contact for pricing”*, WhatsApp button, related dresses.
6. **Bag & checkout** — Add to bag → phone number → order confirm → *“Thank you for your order! Please attend our call for order confirmation.”* (message editable). Order **Admin → Inbox → Orders** mein aa jata hai.
7. **Ratings & complaints** — customer site par de sakta hai; **ratings sirf aap ko** dikhti hain, customers ko kabhi nahi.

---

### 4. Admin panel — tab by tab

| Tab | Kya control hota hai |
|---|---|
| **Dashboard** | Live counts (dresses, collections, views, orders, VIP leads, complaints, average rating), setup checklist, quick on/off switches (notice bar, most-loved section, popup), recent orders. |
| **Posters & Hero** | Jitne chahein posters upload karein (drag-drop), ↑ ↓ se tarteeb, delete, autoplay on/off, seconds per poster (default 3 s). |
| **Collections** | Add / rename / description / box image / page banner / hide / reorder (↑ ↓) / delete. Home page aur menu dono isi tarteeb se hain. |
| **Dresses & Prices** | Collection choose karein → *Add dress*: **1 se 20 photos** (pehli photo = cover, ↑ ↓ se badlein), name, price, description. Price khaali chhorein → site par *“Contact for pricing”* aayega aur WhatsApp button price poochhne ke liye khulega. |
| **Home Sections** | Notice/offer bar, most-loved wheel (mode: most viewed / first dress of each collection / one collection / off, layout, count, title), valuable-customer popup + delay, order thank-you message. |
| **Inbox** | **Orders** (with “WhatsApp customer”), **Valuable customers** (copy all → WhatsApp group), **Complaints**, **Ratings** (private). |
| **Look & Colours** | Light background presets + colour picker (crystal / pure white / ivory…), night-mode background, gold accent colours, brand name, full name, welcome word, tagline, logo upload, currency list + rates. |
| **Contact & Social** | WhatsApp number (isi se website ke **tamam** WhatsApp buttons chalte hain), phone, email, default message, Instagram / Facebook / YouTube / TikTok / Snapchat / Pinterest — jo link dein sirf wohi icon show hoga aur click par seedha aapki app/ page khulega. |
| **About / Terms / SEO** | About heading + text + image, Terms text **aur/ya** image (dono khaali hon to poora box ghayab — “no image uploaded” kabhi nahi aayega), unlimited branches (name, address, phone), SEO title, meta description, keywords. |
| **Security** | Username, password (min 6 characters), 4-digit PIN change — current password zaroori hai, phir dobara login. |

**Uploads:** JPG/PNG/WEBP, 25 MB tak har image. Server khud har image ko WebP mein convert karke crop/resize karta hai + ek light thumbnail banata hai, is liye site tez rehti hai. (Poster 2400 px, dress 2000 px, collection 1600 px — quality khud adjust hoti hai.)

**Security:** scrypt-hashed password & PIN, httpOnly + SameSite=Strict session cookie (12 ghante), 6 ghalat koshishon ke baad login block (15 min), public forms par rate limits, sirf image upload, admin page `noindex`.

---

### 5. SEO — search mein upar aane ke liye (already set)

* Har page ka apna **title, meta description, canonical, Open Graph/Twitter card** (collection aur dress pages ke bhi).
* **JSON-LD structured data** — `ClothingStore` + `Organization` + `WebSite` (logo, address, phone, socials) → Google ko brand, branches aur products samajh aate hain.
* Auto **`/sitemap.xml`** (home + har collection + har dress) aur **`/robots.txt`**.
* Keywords already bridal-focused: *bridal dresses, pakistani bridal dresses, barat lehenga, walima dress, mehndi dress, party wear, luxury bridal couture* — ye Admin → About/Terms/SEO se badle ja sakte hain.
* Performance = ranking: ~100 KB initial load, WebP + lazy loading, gzip, long-cache headers, preloaded fonts, semantic headings, descriptive alt text — Core Web Vitals friendly.

**Go-live checklist:**
1. Domain connect karein + HTTPS (Cloudflare/nginx).
2. Google Search Console mein `https://yourdomain.com/sitemap.xml` submit karein.
3. Har branch ka **Google Business Profile** banayein (local “bridal dress near me” searches ke liye sab se zaroori).
4. Instagram/Facebook bio mein website ka link.

---

### 6. Aage kya karna hai (aap ka kaam)

Site abhi **placeholder photography** ke saath hai (AI-generated bridal/formal shots — bilkul aap ki asli dresses nahi). Replace karein:

1. **Posters & Hero** → apne campaign posters upload karein (ya jo 2 sample hain unhein delete karein).
2. **Collections** → 4 default (Barat / Walima / Mehndi / Party) rename ya delete karein, naye add karein, har box ka image lagayein.
3. **Dresses & Prices** → har collection mein apni asli dresses, photos aur prices daalein.
4. **Contact & Social** → WhatsApp number (`923001234567` format), phone, email, aur saare social links.
5. **About / Terms / SEO** → about text, terms, branches, keywords.
6. **Security** → username, password, PIN.
7. **Look & Colours** → pasand ka background (crystal cream default, ya pure white).

> Jab tak WhatsApp number nahi dala, WhatsApp buttons aur floating button show nahi honge (ye jaan-boojh kar hai, taake galat number par message na jaye).

---

### 7. Technical summary

```
site/
├── server.js            Express: public API + protected admin API + uploads + SEO + gzip
├── seed.js              first-run content     (npm run reset = fresh start)
├── lib/store.js         JSON data store, atomic writes (no database to install)
├── lib/auth.js          scrypt hashing, sessions, login throttling
├── data/db.json         ← saara content yahan (backup!)
└── public/
    ├── index.html       storefront shell (critical CSS inline → instant paint)
    ├── admin.html       admin shell
    ├── assets/css/      app.css · admin.css
    ├── assets/js/       welcome.js (bubbles + 3D logo) · app.js · admin.js
    ├── assets/fonts/    self-hosted Cormorant Garamond, Great Vibes, Jost
    ├── assets/img/      logo + starter photography
    └── uploads/         aap ki uploads (auto WebP + thumbnails)
```

**Deploy:** kisi bhi Node 18+ host par (VPS, Railway, Render, Fly, DigitalOcean, cPanel+Node):

```bash
NODE_ENV=production PORT=8080 node server.js
```

Docker bhi included hai: `docker build -t znz . && docker run -p 3000:3000 -v $PWD/data:/app/data -v $PWD/public/uploads:/app/public/uploads znz`

**Backup:** sirf do cheezein — `site/data/db.json` aur `site/public/uploads/` folder. Inka copy = poora content safe.

**Routes:** `/` home · `/c/:collectionId` · `/d/:collectionId/:dressId` · `/admin` · `/api/bootstrap` · `/sitemap.xml` · `/robots.txt`

---

### 8. Quick FAQ

**Q. Welcome screen har baar aayega?**
Har naye visit/refresh par haan (brand impression ke liye) — lekin usi session mein dobara refresh karne par ~1 second baad khud enter ho jata hai, aur deep links par bhi auto-enter hai. Chahiye to ise admin se control kiya ja sakta hai (batayein).

**Q. Bubbles rukte kyun nahi?**
Ye `requestAnimationFrame` par chalti hain — 3.5 s mein paida hoti hain, 4–5.6 s baad burst hoti hain, nayi turant banti rehti hain. Tab background mein ho to animation pause ho jati hai (battery bachti hai) aur wapas aane par continue.

**Q. Dress ki 15 photos daal sakta hoon?**
Haan — ek dress mein 20 tak photos. Customer swipe, arrows ya thumbnails se saari dekhta hai; grid/wheel par sirf cover photo dikhti hai.

**Q. Price mention na karoon?**
Price khaali chhorein → site par *“Contact for pricing”* aayega, aur us dress ki WhatsApp button price poochhne ka pre-filled message khol degi.

**Q. Background white karna hai?**
Admin → Look & Colours → pure white preset. Logo golden hi rehta hai. Night mode ka background bhi wahi se set hota hai.

**Q. Ratings customer ko dikhengi?**
Nahi. Sirf aap ke Inbox mein aati hain.
