# 🔎 Google par kaise aayein (aur site ka address kya hoga)

## 1) Site ka address — kya is mein "Ahsan" aayega?

**Nahi.** Do alag cheezein hain:

| Cheez | Misaal | Kahan dikhti hai |
|---|---|---|
| GitHub repo (code ki jagah) | `github.com/ahsan786786-star/znz` | sirf aap ke liye |
| **Live website ka address** | `https://znz-luxury-bridals.onrender.com` | clients ko yehi dikhega |

Website ka naam Render deta hai — jo naam `render.yaml` mein likha hai (`znz-luxury-bridals`).
Aap ise badal sakte hain: `render.yaml` mein `name: znz-luxury-bridals` ko `name: znz` kar dein →
address ban jayega `https://znz.onrender.com` (agar wo naam pehle se kisi ne na liya ho).
Render dashboard ▸ Settings ▸ **Name** se bhi badla ja sakta hai.

**Bilkul apna naam chahiye?** Domain lena padega (fees ~$10–15 saalana, misaal `znz.com.pk` ya
`zainzara.com`) → Render ▸ Settings ▸ **Custom Domains** → jo CNAME mile wo domain provider mein laga dein.
HTTPS free milta hai. Ye optional hai — site bina domain ke bhi poori chalti hai.

## 2) Chrome mein search karne se khulegi?

Chrome koi search engine nahi — Chrome mein aap **Google** par search karte hain. Aur Google par site
**khud-ba-khud foran nahi** aati. Us ke liye 3 cheezein chahiye:

1. Site **live** ho (Render)
2. Google ko **batana** padega (Search Console)
3. **Waqt** — naye site ko Google 3 din se 3 hafte mein index karta hai

Site ki technical SEO pehle se tayyar hai (maine banate waqt daali thi):

* har page ka apna `<title>` + description
* `sitemap.xml` (saare collections + dresses ke links) ✔ check kiya
* `robots.txt` (admin/api band, baqi khula) ✔
* structured data (JSON-LD) — Google ko batata hai ke ye BridalShop hai, kis city mein, kya rate
* canonical, Open Graph (WhatsApp/Facebook par link ka preview)

## 3) Search Console — 10 minute ka kaam (deploy ke baad)

1. <https://search.google.com/search-console> → Google account se sign in
2. **Add property** → **URL prefix** → apna live address paste karein
   (misaal `https://znz-luxury-bridals.onrender.com/`)
3. Verify: sab se aasan tareeqa — **HTML tag** copy karke apni site ke `<head>` mein daalna.
   Aap ke case mein mujhe wo tag bhej dein, main `public/index.html` mein laga dunga aur naya ZIP dunga
   (ya aap khud `public/index.html` ki upar wali lines mein paste kar dein) →
   **Verify**
4. Left menu ▸ **Sitemaps** → `sitemap.xml` likh kar **Submit**
5. Left menu ▸ **URL Inspection** → apna home address daalein → **Request indexing**

Us ke baad **Performance** tab mein 3–14 din mein queries dikhna shuru hoti hain
("bridal lehenga pakistan", "walima dress", aap ki city + "bridal" waghera).

## 4) Ahm baat — free plan aur Google

Render ka free plan 15 minute khamosh rehne par so jata hai, aur **sote waqt `robots.txt` par
`Disallow: /`** bhejta hai — Google crawl nahi kar pata. Is liye:

| Chahte hain | Kya karein |
|---|---|
| Sirf clients ko link bhejna (WhatsApp/Insta) | free plan kaafi — link kaam karta hai |
| Google par aana, magar free | <https://cron-job.org> se har 10 min `https://AAPKA-LINK/api/health` ping karwa dein (service jaagti rahegi; poore 750 ghante kharch honge) |
| Serious business / roz traffic | Render **Starter $7/mahina** — na sleep, na robots masla, tez speed |

## 5) Google se pehle yahan link daalein (free, foran traffic)

1. **Google Business Profile** (agar dukaan/studio hai) — local search mein sab se tez asar
2. Instagram / Facebook bio mein link
3. WhatsApp Business profile + status
4. Pakistan ke bridal groups / Pinterest (bridal dresses wahan bohot search hoti hain)
5. `sitemap.xml` ko Bing Webmaster Tools mein bhi submit kar dein (Bing + DuckDuckGo)

## 6) Chhota checklist

- [ ] Site live hai (`https://…onrender.com`)
- [ ] Search Console mein property add + verify
- [ ] `sitemap.xml` submit
- [ ] Home page "Request indexing"
- [ ] `AAPKA-LINK/robots.txt` khol kar dekh lein — `Allow: /` likha ho
- [ ] `AAPKA-LINK/sitemap.xml` khul raha ho
- [ ] 1 hafte baad Search Console ▸ Pages dekhein — "Indexed" badh raha ho
