# ROUND 17 — BRAND WHATSAPP + SUPER FAST (8.4.0)

Is round me aap ke teen kaam + speed. Sab kuch ek hi ZIP me hai — **ek hi baar update karein**.

---

## 1) BRAND KA WHATSAPP NUMBER — 03267600205

Ab do numbers hain, dono apni jagah:

| Number | Kis kaam ka | Kahan dikhta hai |
|---|---|---|
| **03267600205** | **Dress inquiry** — client ki chat seedha aap ke paas | floating WhatsApp button, product page, collection page, contact section, bag/order |
| **0305 6874078** | Website banwane ke liye (Cunix Web Developers) | sirf footer ki "Crafted by…" line |

**Har button par click → WhatsApp khulta hai, message pehla se likha hota hai:**

* Product page (**Ask about this dress**):
  > Assalam o Alaikum Z&Z! I am interested in this dress: **Zohra — Crimson Zardozi Lehenga — Rs 285,000** (https://znz.onrender.com/d/barat/zohra)
* Collection page: *"Please share more designs from your **Barat Wear** collection"* + link
* Bag/order: *"I would like to place an order: …"*
* Contact / floating button: general inquiry message

Client ko sirf **Send** dabana hota hai. Number, naam, link — sab khud bhar jata hai.

**Badalna ho to:** Owner ▸ **Contact & social** ▸ *WhatsApp — dress inquiries* + *WhatsApp ke pehle messages* (har message alag se edit ho sakta hai — `{name}`, `{link}`, `{collection}`, `{price}`, `{items}` khud bhar jate hain).

---

## 2) SUPER FAST — kya kya kiya (measured)

| Kaam | Pehle | Ab |
|---|---|---|
| app.js | 90 KB → **21 KB** gzip | minified + gzip |
| welcome.js | 25 KB → **5.2 KB** | minified + gzip |
| tryon.js (studio) | **har page par** load hota tha | sirf `/look` khulne par load hota hai (**32 KB bach gaye**) |
| app.css | 74 KB → **13 KB** gzip | minified + gzip |
| Welcome logo | 146 KB (@2x) | **116 KB** 480px + srcset (phone par chhota file) |
| Hero poster | 116 KB full file | phone par **25 KB** (-md), desktop par 85 KB (-lg) |
| Page HTML | har baar dobara | gzip + **ETag → 304** (dobara aane wale ko 0 byte) |
| Repeat visit | server ka intezar | **localStorage se turant paint**, phir background me update |
| Slow signal | 20 s tak blank | **7 s maximum**, phir bhi shop khul jati hai |
| Photos | scroll par sab load | **IntersectionObserver** — sirf screen wali photos (high priority), baqi baad me |
| `/uploads` photos | 30 din cache | **1 saal cache** (file ka naam badalta nahi) |
| Service worker | shell cache | CSS+JS+logo **pre-cache** — dobara khulte hi instant |
| Build step | — | `tools-minify.js` (boot par bhi khud check karta hai) |

Phone (390×844) par naapa gaya: pehla paint ~**3 s** (local server + font warm-up se pehle ~8.5 s),
aur repeat visit par browser cache se **instant**.

---

## 3) GOOGLE KE LIYE BEHTARI (bonus, isi round me)

* Har dress page par **Product structured data** (naam, price PKR, photo, availability) — Google result me price/naam dikha sakta hai
* **Breadcrumb** data (Home → Collection → Dress)
* Sitemap me `lastmod` + sahi priority
* Ghair-maujood page ab **asli 404 + noindex** (Google ko soft-404 nahi milta) — SEO saaf
* HTML pages **304** dete hain (Googlebot ka crawl fast, bandwidth kam)

---

## Kya nahi badla

Logins URL-only (`/owner`, `/admin`) · Download app (drawer ke neeche) · bubbles/stars ·
13 layout effects · try-on studio · multi-collection dress · analytics · custom pages ·
backup/restore · keep-awake · GitHub storage — sab wesa hi hai.

`/api/version` → **8.4.0 / build 2026-10-28-r17**
