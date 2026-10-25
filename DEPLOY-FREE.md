# Z&Z ko FREE live karna — GitHub + Render (step by step)

> Chhota jawaab: **GitHub Pages par ye website nahi chal sakti**, kyunke GitHub Pages sirf
> *static* files dikhata hai. Aap ki site Node.js par chalti hai (admin panel, owner panel,
> dress upload, background removal, try-on save — sab server par hote hain).
> Isliye tareeqa ye hai: **code GitHub par** (free) + **hosting Render par** (free), aur dono
> aapas mein jure hue — jab aap GitHub par code bhejein, Render khud-ba-khud naya version live kar deta hai.
>
> Kya main (AI) ye khud kar sakta hoon? Nahi — GitHub/Render par login aap ke account ka hota hai.
> Isliye main ne **sab kuch tayyar kar diya hai** (Dockerfile, render.yaml, GitHub storage) —
> aap ko sirf neeche diye gaye 8 steps karne hain (lagbhag 10 minute, koi coding nahi).

---

## Kya kya tayyar hai (mere taraf se)

| File | Kaam |
|---|---|
| `Dockerfile` | kisi bhi free Docker host par chalne ke liye |
| `render.yaml` | Render par 1-click deploy ka blueprint |
| `lib/ghsync.js` | **GitHub storage** — settings aur upload ki hui tasveerein aap ke repo mein save hoti hain, host restart hone par bhi kuch zaya nahi hota |
| `.gitignore` / `.dockerignore` | repo saaf rakhne ke liye |
| `package.json` → `start` | `node server.js` (host isi ko chalata hai) |

---

## Step 1 — GitHub account

Agar account nahi hai: <https://github.com/signup> → email, password, username → free plan (kuch nahi dena).

## Step 2 — Naya repo banayein

1. GitHub par upar right **+** → **New repository**
2. Name: `znz-website`
3. **Public** ya **Private** — dono chalenge (Private behtar hai)
4. **Create repository** (README waghera kuch add na karein)

## Step 3 — Website ka folder GitHub par bhejein

Zip khol kar `znz-website` folder apne computer par rakhein, phir:

**Aasan tareeqa — GitHub Desktop app** (<https://desktop.github.com>)
1. App mein **File ▸ Add local repository** → `znz-website` folder chunein
2. "create a repository" ka option aaye to haan karein → **Publish repository** → apna repo `znz-website` chunein

**Ya command line (Windows: PowerShell, Mac: Terminal)**

```bash
cd path/to/znz-website
git init
git add .
git commit -m "Z&Z website"
git branch -M main
git remote add origin https://github.com/APNA-USERNAME/znz-website.git
git push -u origin main
```

> Note: `node_modules` folder kabhi upload na karein — `.gitignore` already rok deta hai.

## Step 4 — Render par free account

<https://render.com> → **Get Started** → **Sign in with GitHub** (isi se repo khud nazar aayega).
Card ki zaroorat nahi, free plan kaafi hai.

## Step 5 — Deploy

1. Render dashboard → **New +** → **Blueprint** (ya **Web Service**)
2. Repo `znz-website` chunein → Render `render.yaml` khud parh lega → **Apply**
   *(Web Service chunein to: Build = `npm install --omit=dev`, Start = `node server.js`, Plan = Free)*
3. 1–2 minute mein build ho jayega
4. Aap ka free link mil jayega, misaal: `https://znz-luxury-bridals.onrender.com`

Site live hai: storefront `/`, admin `/admin`, owner `/owner`.

## Step 6 — (Zaroori) GitHub storage on karein

Free host ka disk khali hota hai — restart par settings aur uploads ud sakte hain. Isko band karne ke liye:

1. GitHub → apna profile → **Settings ▸ Developer settings ▸ Personal access tokens ▸ Fine-grained tokens**
   → **Generate new token**
2. **Repository access:** *Only select repositories* → `znz-website`
3. **Permissions ▸ Repository permissions ▸ Contents: Read and write** (bas yahi ek)
4. Generate → token copy karein (`github_pat_…`)
5. Render dashboard → apni service → **Environment** → ye do variables add karein:

| Key | Value |
|---|---|
| `GH_REPO` | `APNA-USERNAME/znz-website` |
| `GH_TOKEN` | wo `github_pat_…` token |

6. **Save** → service khud restart hogi.

Ab jab bhi aap dress add karein, price badlein ya tasveer upload karein — sab **aap ke GitHub repo mein commit** ho jata hai. Kal host restart ho ya naya deploy aaye, sara data wapis aa jata hai.

## Step 7 — Pehla login badlein

Live site khol kar `/owner` par jayein:

* Owner: `1234567890123` / `admin123` / PIN `998877`
* Admin: `admin` / `znz2026` / PIN `2026`

Owner panel ki **Security** tab se dono ke password/PIN badal dein, aur admin ki access wahi se control karein.

## Step 8 — Apna domain (optional, free nahi)

`znz.com` jaisa domain chahiye to (domain ki fees lagti hai) — Render ▸ **Settings ▸ Custom Domains** mein domain add karein aur jo CNAME mile wo apne domain provider (Namecheap / GoDaddy / Cloudflare) mein laga dein. HTTPS Render khud free deta hai.

---

## Free plan ki 3 haqeeqatein (pehle se jaan lein)

1. **Sleep:** Render free service 15 minute bilkul khamosh rehne par so jati hai; agli visit par ~30–60 second lag sakte hain. Chahein to <https://cron-job.org> se har 10 minute mein `/api/health` ping karwa lein (free) — jagti rehti hai.
2. **Speed:** free plan ka CPU chhota hai; site khud halki hai (gzip, webp, cache), phir bhi bade traffic ke liye paid plan.
3. **Email/WhatsApp bot:** koi email sending nahi hoti — leads admin panel ke Inbox mein aate hain (jaisa design hai).

## Doosre free hosts (agar Render pasand na aaye)

| Host | Note |
|---|---|
| **Koyeb** (koyeb.com) | free web service, Docker ya Node; disk khali — GitHub storage se poora kaam |
| **Hugging Face Spaces** | free Docker space; 48 ghante inactivity par band |
| **Fly.io** | pay-as-you-go, chhoti free allowance |
| **Vercel / Netlify** | *in par ye site theek nahi chalti* — sirf static files, admin/upload kaam nahi karega |

---

## Ghalat kya kya ho sakta hai (aur hal)

| Masla | Hal |
|---|---|
| Build fail: `sharp` | Node version 20 rakhein (`NODE_VERSION=20.11.1`), phir dobara deploy |
| Site khulti hai lekin tasveerein nahi | repo mein `public/assets/img` upload hua hai ya nahi check karein |
| Admin login ke baad sab ghayab | `GH_REPO` / `GH_TOKEN` set nahi — Step 6 dobara |
| Upload ke baad "Saved" lekin restart par nahi | wahi, token ki permission **Contents: Read and write** honi chahiye |
| Pehli visit slow | free plan ka sleep — upar wala cron ping laga dein |

---

## Ek line mein

**Code GitHub par → Render free service → Render par `GH_REPO` + `GH_TOKEN` → site live, data GitHub mein mehfooz.**
