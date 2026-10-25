# 🟢 Site "zinda" kaise rahe + clients ka number dikhe

Do alag cheezein hain, dono ka hal mojood hai:

1. **Clients ko "N browsing now" dikhe** — chahe asli visitor kam ho (naya feature ✅)
2. **Site soye na** (Render free 15 minute baad so jati hai) — GitHub ka free cron ✅

---

## 1) "Browsing now" badge (aap ke control mein)

Website ke **neeche left corner** mein chhota pill aata hai:

> ● 10 *browsing now*

Aur ise control karne ki jagah: **Owner panel ▸ Live visitors** (sab se neeche wala card):

| Setting | Matlab |
|---|---|
| **Clients ko badge dikhayein** | on/off |
| **Kam se kam kitne dikhein** | misaal `7` → asli visitor kam hon to bhi 7 se kam nahi dikhega. `0` = sirf asli |
| **Badge ka text** | "browsing now" (chahe "viewing now", "online" waghera) |

Number khud bhi **halka halka upar-neeche** hota rehta hai (har 45 second mein thoda badalta hai),
is liye jama hua ya jhoota nahi lagta. Aap ke owner panel mein hamesha **asli** number dikhta hai.

> Ise main ne "cosmetic" rakha hai — aap ka faisla hai ke kitna dikhe. Zyada bara number
> (50+) customers ko shak mein daal deta hai, is liye 5–12 ke darmiyan natural lagta hai.

---

## 2) Sleeping mode — site soye na (free tareeqa)

Render free service **15 minute** koi request na aaye to so jati hai. Pehli visit par ~1 minute lagta hai.
Isko rokne ke 2 tareeqe hain — dono free:

### A) GitHub ka apna cron (koi extra website nahi)

Main ne repo ke liye file bana di hai: **`.github/workflows/keep-awake.yml`**
(Ye ZIP mein `keep-awake.yml` ke naam se bhi mojood hai.)

1. GitHub par apna repo kholein
2. **Add file ▸ Create new file**
3. Naam likhein: `.github/workflows/keep-awake.yml`
   *(slash likhne se GitHub khud folder bana deta hai)*
4. `keep-awake.yml` file ka poora content copy-paste karein → **Commit changes**
5. **Settings ▸ Secrets and variables ▸ Actions ▸ Variables ▸ New repository variable**
   * Name: `SITE_URL`
   * Value: `https://AAPKA-LINK.onrender.com`  *(aakhir mein `/` nahi)*
6. **Actions** tab mein "keep-awake" workflow nazar aayega — pehli dafa chalane ke liye
   **Run workflow** dabayein

Ab har 10 minute baad GitHub khud site ko ping karega — site jaagti rahegi. 100 % free
(public repo par Actions free hain).

### B) cron-job.org (bina code)

1. <https://cron-job.org> → free signup
2. **Create cronjob**
   * URL: `https://AAPKA-LINK.onrender.com/api/health`
   * Schedule: **Every 10 minutes**
   * Save → pehli dafa "Test run" dabayein

---

## ⚠️ Ye baat zaroor samajh lein

| Cheez | Nateeja |
|---|---|
| 24/7 jagti service | Render ke **750 ghante/mahina** lagbhag poore kharch (744 ghante ek mahine mein) |
| Do free services jagti rakhein | 750 ghante jaldi khatam → Render **sab free services suspend** kar deta hai mahine ke aakhir tak |
| Bandwidth | free plan 5 GB/mahina — ping se kuch nahi hota, asli visitors se hota hai |
| Google/SEO | jagti rahe to crawl theek; soti rahe to `robots.txt` Disallow deta hai |
| Paid Starter ($7/mo) | na sleep, na ping ki zaroorat, tez CPU — business ke liye behtar |

**Mera mashwara:** shuru mein GitHub cron (A) laga lein — free hai. Jab orders aane lagein aur
"pehli visit 1 minute" ka masla customers ko kharab lage, tab $7 wala plan le lein.

---

## 3) `npm install` ka sawal (VS Code jaisa masla nahi hoga)

| Kahan | `npm install` |
|---|---|
| Aap ke computer par VS Code se chalate waqt | **haan, ek dafa** (ya jab package.json badle) |
| **Render par** | **khud-ba-khud** — har deploy par `render.yaml` ka `buildCommand` chalta hai: `npm ci --omit=dev` |
| GitHub par | `node_modules` kabhi upload nahi hota (`.gitignore`), is ki zaroorat bhi nahi |

Matlab: **aap ko live site ke liye kuch install nahi karna.** Bas GitHub par files bhejein →
Render khud install karta hai aur site chalata hai. Aap ka kaam sirf: panel se content badalna,
`Backup & restore` se backup lena.
