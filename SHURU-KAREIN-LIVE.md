# 🚀 Z&Z — 20 minute mein FREE live (bilkul shuru se)

Aap ne kaha: GitHub account nahi hai, aap khud steps karenge, aur dresses/settings mehfooz rahni chahiye.
Ye guide bilkul wahi hai — **koi coding nahi, koi card nahi**. Sirf clicks.

**Kya karna hai (chhota naksha):**

```
Aap ka computer  →  GitHub (code + data, free)  →  Render (hosting, free)  →  Live website
```

Kyun aisa? GitHub Pages sirf *static* site dikhata hai — hamari site Node.js par chalti hai (admin,
upload, background removal, try-on). Isliye code GitHub par, chalayi Render ne.

---

> ⚠️ **"Access is temporarily restricted" aa raha hai?** Ye GitHub ka bot-protection hai, account ban
> nahi hua. Hal (VPN off, mobile data, incognito, 1 ghanta wait) aur **GitLab wala alternate rasta**
> `GITHUB-BLOCK-HAL.md` mein likha hai.

## ✅ Step 1 — GitHub account (3 minute)

1. Kholein: <https://github.com/signup>
2. Email dalein → password → **username** (sirf chhote letters, numbers aur `-`; misaal: `zainzara-atelier`)
3. Puzzle/verification → **Create account**
4. Email par aaya **8-digit code** dalein

> Username yaad rakhein — aage `GH_REPO` mein wahi likhna hai.

## ✅ Step 2 — GitHub Desktop app (2 minute)

Terminal se bachne ke liye:

1. Kholein <https://desktop.github.com> → **Download for Windows** (ya Mac)
2. Install karke kholein → **Sign in to GitHub.com** → browser khulega → **Authorize desktop**
3. App ke andar wapas aa jayein

## ✅ Step 3 — Website ka folder tayyar karein (2 minute)

1. `ZNZ-Luxury-Bridals-Website.zip` ko apne computer par **extract** karein
2. Andar `znz-website` folder milega — **isi folder ko** aage use karna hai (zip ko nahi)

## ✅ Step 4 — Folder ko GitHub par bhejein (3 minute)

1. GitHub Desktop mein: **File ▸ Add local repository…**
2. **Choose…** → apna `znz-website` folder chunein
3. Neeche likha aayega *"This directory does not appear to be a Git repository"* → usi line mein
   **create a repository** par click karein
4. Window mein:
   * **Name:** `znz-website`
   * **Initialize this repository with a README:** ☐ **khali chhodein**
   * **Git ignore / License:** None
   * **Create Repository**
5. Ab andar saikdon files "Changes" mein dikhengi — ye theek hai
6. Neeche left par **Commit to main** (message already likha hoga) → **Commit**
7. Upar **Publish repository** → agar public chahiye to *Keep this code private* ka ☑ hata dein →
   **Publish repository**

Bas — aap ka code GitHub par hai: `https://github.com/APNA-USERNAME/znz-website`

## ✅ Step 5 — Render par account + deploy (5 minute)

1. Kholein <https://render.com> → **Get Started** → **GitHub** → **Authorize Render**
   *(card nahi maangta, free plan)*
2. Dashboard mein: **New +** → **Blueprint**
3. List mein apna repo `znz-website` chunein → **Connect** → **Apply**
   *(Render ne pehle se `render.yaml` parh liya hai — build/start khud set hain)*
4. 2–4 minute build hoga. Status **Live** hone par upar link milega, misaal:
   `https://znz-luxury-bridals.onrender.com`

**Pehli baar kholte waqt ~1 minute lag sakta hai** (free service so rahi hoti hai, phir jaag jati hai).

Ab check karein:
* Store: `https://APNA-LINK.onrender.com`
* Admin: `https://APNA-LINK.onrender.com/admin`
* Owner: `https://APNA-LINK.onrender.com/owner`

## ✅ Step 6 — Data mehfooz karein (GitHub storage) — **sab se zaroori step**

Free host ka disk restart par khali ho jata hai. Isi liye main ne site ke andar **GitHub storage**
daal diya hai: jo bhi aap admin panel se badlein, wo seedha **aap ke GitHub repo mein commit** ho jata hai.

**6a. Token banayein**
1. GitHub par upar right apni photo → **Settings**
2. Left menu sab se neeche → **Developer settings**
3. **Personal access tokens** → **Fine-grained tokens** → **Generate new token**
4. Bhar dein:
   * **Token name:** `znz-render`
   * **Expiration:** 1 year (ya jitna chahein)
   * **Repository access:** *Only select repositories* → `znz-website`
   * **Permissions ▸ Repository permissions ▸ Contents → Read and write** *(bas yahi ek)*
5. **Generate token** → token copy karein (shuru hota hai `github_pat_` se)
   ⚠️ Token kisi ko na dein. Ghalati se leak ho jaye to usi page se **Delete** karke naya bana lein.

**6b. Render mein daalein**
1. Render dashboard → apni service `znz-luxury-bridals` → **Environment**
2. **Add Environment Variable** do dafa:

| Key | Value |
|---|---|
| `GH_REPO` | `APNA-USERNAME/znz-website` |
| `GH_TOKEN` | `github_pat_…` (jo copy kiya) |

3. **Save Changes** → service khud restart hogi (1–2 minute)

**6c. Test karein ke sach mein kaam kar raha hai**
1. Site → `/owner` → login: `1234567890123` / `admin123` / PIN `998877`
2. Owner **Security** tab se apna password aur PIN badal dein
   (aur admin `admin` / `znz2026` / PIN `2026` bhi wahi se badal dein)
3. Admin panel se ek test dress add karein
4. Render → **Manual Deploy ▸ Restart service** → restart ke baad bhi dress maujood honi chahiye ✔
5. GitHub repo khol kar dekhein — `data/db.json` mein naya commit nazar aayega

## ✅ Step 6½ — Data ka dusra hal (GitHub token nahi lagana chahte?)

Owner panel → **Backup & restore** → **Download backup (.zip)**. Free host restart ho jaye to wahi
page → **Restore from backup**. Is se settings, dresses, prices aur tamam tasveerein wapis aa jati hain —
bina kisi token ke.

## ✅ Step 7 — Roz marra ka istemal

| Kaam | Kahan |
|---|---|
| Naya dress / price / banner | Admin ya Owner panel (website par) — khud save ho jata hai |
| Client ki try-on tasveerein | Admin ▸ **Client photos** |
| Naya code version (mujh se ZIP aaye) | Purani files replace karein → GitHub Desktop → **Commit** → **Push** → Render khud deploy karega |

---

## ⚠️ Free plan ki sacchai (pehle se jaan lein)

| Cheez | Render free |
|---|---|
| Kharcha | 0 (card nahi) |
| RAM / CPU | 512 MB / 0.1 CPU |
| Sleep | 15 minute traffic na ho to so jati hai; agli visit ~1 minute |
| Hours | 750 instance hours/mahina (ek service 24/7 jagti rahe to ~744 ghante — bilkul limit par) |
| Disk | **khali** har restart par → isi liye GitHub storage (Step 6) |
| Bandwidth | 5 GB/mahina |
| SEO | **jab service so rahi ho, Google ke liye `robots.txt` = Disallow** — is liye serious business ke liye $7/mahina wala Starter plan behtar hai (na sleep, na ye masla) |

Chahein to <https://cron-job.org> (free) se har 10 minute `https://APNA-LINK.onrender.com/api/health`
ping karwa lein — service jaagti rehti hai (magar poori 750 ghante ki limit kharch hoti hai).

---

## 🧯 Masle aur unka hal

| Jo dikhe | Hal |
|---|---|
| Build fail, `sharp` ka error | Render ▸ Environment → `NODE_VERSION` = `20.11.1` → Manual Deploy |
| Service Live hai magar page nahi khulta | 1 minute wait (cold start), phir refresh |
| Tasveerein ya dresses restart ke baad ghayab | `GH_REPO` / `GH_TOKEN` theek nahi — Step 6 dobara, token ki permission **Contents: Read and write** |
| `GH_TOKEN` ghalat | naya token banayein, Render mein replace karein, save |
| Admin panel khulta hai, save nahi hota | wahi storage masla; ya browser ka private session — normal window mein try karein |
| GitHub Desktop: "Publish" button grey | pehle **Commit to main** karein, phir publish |

---

## 📌 Ek line ka khulasa

**Folder → GitHub Desktop → Publish → Render Blueprint → GH_REPO + GH_TOKEN → live.**
Kul kharcha: **0 rupee**. Baad mein apna domain (`.com` ki fees) laga sakte hain — Render mein
**Settings ▸ Custom Domains**, HTTPS free.
