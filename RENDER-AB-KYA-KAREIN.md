# ✅ GitHub par publish ho gaya — ab Render par live karein

Aap ne jo kiya wo **bilkul theek** hai: GitHub Desktop ne code GitHub par bhej diya
("Fetch origin — Last fetched 1 minute ago" ka matlab hai sab sync hai ✔).

> ⚠️ Lekin **website abhi live nahi hui**. GitHub par code rakhna = kitab almari mein rakhna.
> "Live" karne ke liye us code ko chalane wali machine chahiye — **Render** (free).

---

## Step A — 30 second ka check (repo theek hai ya nahi)

GitHub Desktop mein **Repository ▸ View on GitHub** dabayein (ya browser mein
`github.com/ahsan786786-star/znz-website` kholein).

Repo ke **root** mein ye cheezein nazar aani chahiye:

```
server.js      package.json      package-lock.json      render.yaml      Dockerfile
public/        lib/              data/                  *.md guides
```

### Do mumkin masle

**1) Root mein sirf ek folder `znz-website` nazar aaye** (nested folder)
→ is ka matlab aap ne poora folder andar daal diya. Render par build fail hoga.
Hal (sab se aasan): Render mein service banate waqt **Root Directory** ki jagah `znz-website` likh dein.
(Ya GitHub Desktop mein sahi folder dobara add karein — jis folder ke andar seedha `server.js` ho.)

**2) `public/assets/img/dresses/` kholein** → **80 files** honi chahiye
(agar sirf kuch files hain to images adhoori hain — bata dein, main dobara 3-hisso wali ZIP dunga).

---

## Step B — Render par deploy (5 minute, free)

1. <https://render.com> → **Get Started** → **GitHub** se sign in → **Authorize Render**
2. Dashboard → **New +** → **Web Service**
3. Repo list mein `znz-website` chunein → **Connect**
4. Ye settings bharein:

| Field | Value |
|---|---|
| **Name** | `znz-luxury-bridals` (ya jo pasand ho) |
| **Language / Runtime** | Node |
| **Branch** | `main` |
| **Root Directory** | khali chhodein *(agar Step A ka masla 1 ho to `znz-website`)* |
| **Build Command** | `npm ci --omit=dev` |
| **Start Command** | `node server.js` |
| **Instance Type** | **Free** |
| **Environment Variable** | `NODE_VERSION` = `20.11.1` |

5. **Create Web Service** → 3–5 minute build → status **Live**
6. Upar link milega: `https://znz-luxury-bridals.onrender.com`

**Pehli dafa kholte waqt ~1 minute** lag sakta hai (free service so rahi hoti hai).

### Turant check karein

| Khatka | Kya dekhna hai |
|---|---|
| Store | `https://LINK.onrender.com` → welcome page → “Welcome / Z&Z” |
| Admin | `https://LINK.onrender.com/admin` |
| Owner | `https://LINK.onrender.com/owner` → login `1234567890123` / `admin123` / PIN `998877` |
| Health | `https://LINK.onrender.com/api/health` → `{"ok":true,...}` |

Log in karke **Security** tab se owner aur admin ke password/PIN foran badal dein.

---

## Step C — Data mehfooz (2 minute, optional magar ahem)

Free host restart par disk khali ho jati hai. 2 mein se koi ek:

**Aasan:** `/owner` ▸ **Backup & restore** ▸ *Download backup (.zip)* — jab bhi content add karein,
ek backup le lein. Restart ke baad wahi zip restore.

**Automatic:** Render ▸ Environment mein

| Key | Value |
|---|---|
| `GH_REPO` | `ahsan786786-star/znz-website` |
| `GH_TOKEN` | Fine-grained token (Contents: Read and write) |

> Note: `Backup & restore` tab aur "browsing now" badge **naye version** mein hain. Aap ne
> pehla ZIP upload kiya hai, is liye ye do cheezein abhi nazar nahi aayengi. Chahiye to neeche
> Step D karein (5 minute).

---

## Step D — Naya version chadhana (jab chahein)

1. Naya ZIP (`ZNZ-Luxury-Bridals-Website.zip`) extract karein
2. Us ke andar `znz-website` folder ki **saari files** copy karein aur apne local repo folder
   (jo GitHub Desktop mein khula hai) mein **replace** kar dein
3. GitHub Desktop → neeche **Summary** likhein (misaal: `update: badge + backup`) →
   **Commit to main** → upar **Push origin**
4. Render khud-ba-khud naya version deploy karega (2–3 minute) — kuch dabana nahi

---

## 🧯 Masle

| Jo dikhe | Hal |
|---|---|
| Render build fail: `Cannot find module 'express'` | Root Directory galat hai (Step A ka masla 1) |
| Build fail: `sharp` | Environment mein `NODE_VERSION` = `20.11.1` daal kar Manual Deploy |
| `This site can't be reached` | 1 minute wait (cold start), phir refresh |
| Page khula magar tasveerein nahi | repo mein `public/assets/img` adhoora hai |
| Admin login nahi khulta | `data/db.json` repo mein hai ya nahi dekhein |

---

## Ek line mein

**GitHub ✔ (ho gaya) → Render Web Service → Free → Live link.**
Us ke baad aap ka kaam sirf: panel se content badalna + backup lena.
