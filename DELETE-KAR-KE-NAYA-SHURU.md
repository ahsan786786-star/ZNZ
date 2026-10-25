# 🔄 Purana sab delete karke naya shuru — `ZNZ-WEBSITE-FINAL`

Ye package **ek hi folder** hai, jis ke andar seedha `server.js` hai — GitHub Desktop ke liye bilkul tayyar.
Is mein wo sab kuch hai jo ab tak bana: try-on studio, auto background removal, 13 transitions,
GitHub storage, backup & restore, **browsing-now badge**, aur **keep-awake** (site soye na).

---

## Status abhi kya hai? (seedha jawab)

| Kaam | Status |
|---|---|
| Code likha gaya (R8, 3 panels, try-on) | ✅ mukammal |
| GitHub par publish | ✅ ho gaya (aap ne GitHub Desktop se kar diya) |
| **Render par deploy** | ❌ **nahi hua** — isi liye **website abhi LIVE nahi hai** |
| Link kisi ko bhejna | ❌ abhi koi link mojood nahi |

> GitHub par code hona = site live hona **nahi**. Live hone ke liye Render (free) par service
> banani hoti hai. Wo 5 minute ka kaam **Step 6** mein hai.

---

## 1) Purana repo delete karein (GitHub par)

1. Browser mein `https://github.com/ahsan786786-star/znz-website` kholein
2. **Settings** (upar) → page ka sab se neeche → **Danger Zone** → **Delete this repository**
3. Jo naam likhne ko kahe (`ahsan786786-star/znz-website`) likh dein → **Delete**

> Chaho to purana repo rakh bhi sakte hain — naya repo alag naam se (misaal `znz`) bana lena kaafi hai.

## 2) Purana local folder delete karein

Computer par jis folder ko aap ne GitHub Desktop mein add kiya tha (jis ke andar `znz-website` folder tha)
us ko **delete** kar dein — ya kam az kam us ka naam badal dein `_purana` kar dein, taake confusion na ho.

## 3) Naya package extract karein

`ZNZ-WEBSITE-FINAL.zip` extract karein. Aap ko ek folder milega:

```
ZNZ-WEBSITE-FINAL\
   server.js          ← seedha yahan hai (koi folder ke andar nahi)
   package.json
   public\  lib\  data\
   render.yaml   Dockerfile
```

## 4) GitHub Desktop mein naya repo

1. GitHub Desktop → **File ▸ Add local repository…**
2. **Choose…** → `ZNZ-WEBSITE-FINAL` folder chunein
3. *"This directory does not appear to be a Git repository"* → **create a repository** → **Create Repository**
   (README ka ☑ khali, License = None)
4. Left mein ~187 files dikhengi → neeche **Summary**: `Z&Z final build` → **Commit to main**
5. Upar **Publish repository** → **Name:** `znz` *(ya `znz-website`)* → **☐ Keep this code private** hata dein
   (public chahiye to) → **Publish repository**

Ab repo ban gaya: `https://github.com/ahsan786786-star/znz`

## 5) 30-second check

Repo khol kar dekhein — **root** mein ye hona chahiye:
`server.js` · `package.json` · `render.yaml` · `Dockerfile` · `public/` · `lib/` · `data/`
Aur `public/assets/img/dresses/` mein **80 files**.

## 6) Render par deploy (5 minute — yahi "live" karta hai)

1. <https://render.com> → **Get Started** → **GitHub** se sign in → **Authorize Render**
2. **New +** → **Web Service** → repo `znz` → **Connect**
3. Settings:

| Field | Value |
|---|---|
| Name | `znz-luxury-bridals` |
| Language | Node |
| Branch | `main` |
| Root Directory | **khali** |
| Build Command | `npm ci --omit=dev` |
| Start Command | `node server.js` |
| Instance Type | **Free** |
| Env var | `NODE_VERSION` = `20.11.1` |

4. **Create Web Service** → 3–5 min → **Live** → link: `https://znz-luxury-bridals.onrender.com`

Pehli visit par ~1 minute (cold start). Us ke baad app khud apne aap ko ping karta rahega —
**so nahi jayegi** (Render apna URL `RENDER_EXTERNAL_URL` mein khud deta hai, kuch set karna nahi).

## 7) Login + settings (live jane ke baad)

* Owner: `/owner` → `1234567890123` / `admin123` / PIN `998877` → **Security** se foran badal dein
* Admin: `/admin` → `admin` / `znz2026` / PIN `2026` → owner panel se badlein
* Badge: **Owner ▸ Live visitors** → "kam se kam kitne dikhein" (misaal 7)
* Data mehfooz: Render ▸ Environment → `GH_REPO` = `ahsan786786-star/znz`, `GH_TOKEN` = fine-grained token
  (Contents: Read and write) — phir restart par bhi kuch zaya nahi hoga

## 8) Status khud dekhein (naya feature)

* Browser mein: `https://LINK.onrender.com/api/version`
  → `{"version":"8.0.0","build":"2026-10-25-r8","storage":"github","keepAwake":true,…}`
* Ya **Owner ▸ Dashboard ▸ Site status** card mein: version, uptime, data kahan save ho raha hai,
  aur keep-awake **on/off**

---

## 🧯 Masle

| Jo dikhe | Hal |
|---|---|
| Render build fail: `Cannot find module 'express'` | Root Directory galat — khali karein |
| Build fail `sharp` | `NODE_VERSION=20.11.1` ke baad **Manual Deploy** |
| `Site can't be reached` | cold start, 1 minute wait |
| Owner panel mein "local disk" likha ho | `GH_REPO` + `GH_TOKEN` set nahi hain |
| Badge nazar nahi aata | Owner ▸ Live visitors → "Clients ko badge dikhayein" on |
