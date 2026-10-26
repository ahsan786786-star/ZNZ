# ROUND 15 — FINAL (8.2.0)

Ye aakhri package hai. Is mein pichhli sab cheezein + 3 nayi:
1. **“Download app”** button ☰ menu ke sab se neeche (3-line bar wala page)
2. **Login links chhupe hue** — koi “Admin” button site par nahi; sirf URL se `/admin` aur `/owner`
3. Baqi sab (4K pictures, background bubbles/stars, 13 transitions, badge, keep-awake, backup) waise hi.

---

## 1) Aap ka sawal: “update ke baad data wapas kaise aaye?”

**Haan — 2 tareeqe hain, dono chalte hain:**

| Tareeqa | Kaise | Kab |
|---|---|---|
| **A) GitHub (automatic)** | Jab `GH_REPO` + `GH_TOKEN` set hain (`storage: github`), to aap ki har setting GitHub ke `data/db.json` mein save hoti hai. Naya code daalne par bhi GitHub wali **nayi** db hi load hoti hai — matlab settings wapas purani nahi hotin, **jaisi hain waisi hi rehti hain**. | hamesha (abhi on hai ✔) |
| **B) Backup file (manual)** | `/owner ▸ Backup & restore ▸ Download backup (.zip)` se pehle backup le lein → naya code daalein → wahi zip **Restore from backup** se wapas upload kar dein. | jab aap khud code/folder badlein |

**Ahem:** agar aap **naya poora folder** laga rahe hain to `data\db.json` (aur `public\uploads`) ko **replace na karein** — usi mein aap ka content hai. Backup file (B) sirf us soorat mein chahiye jab aap `db.json` ghalti se replace/delete kar dein, ya doosri machine par site uthayein.

**Tareeqa B se restore karne par kya kya wapas aata hai:** saari settings (posters, prices, collections, notice, badge, bgfx, transitions, permissions, owner/admin login), aur `public/uploads` ki saari tasveerein. Bas restore ke baad page **Ctrl + Shift + R** karein.

---

## 2) Naya: “Download app” (client ke liye)

☰ menu (3 line bar) kholein → sab se neeche **DOWNLOAD APP** button.

* **Android (Chrome)** → “Install now” dabate hi app install ho jata hai; icon home screen par.
* **iPhone (Safari)** → screen par 4 aasan step aa jate hain: Share → **Add to Home Screen** → Add.
* **Laptop (Chrome/Edge)** → address bar ke install icon ya menu → “Install Z&Z…”.
* App full screen khulta hai, bag saved rehta hai, aur **slow internet par bhi** chal jata hai (service worker).
* Play Store ki zaroorat nahi, koi fees nahi, aur update khud ho jata hai (site update = app update).

Tech: `manifest.webmanifest` (name, icons, shortcuts) + `sw.js` service worker + `beforeinstallprompt` prompt + iOS instructions. Test kiya: `/manifest.webmanifest` → 3 icons, 2 shortcuts, standalone; `/sw.js` → 200.

---

## 3) Naya: login links chhupe hue

* Client page ke footer se **“Admin”** link hata diya (aur koi `/admin` / `/owner` link site par nahi).
* Login sirf seedha address se:
 * Admin → `https://znz.onrender.com/admin`
 * Owner → `https://znz.onrender.com/owner`
* Dono panlon par `noindex` hai (Google par nahi aate), aur admin ka login 6 ghalat koshishon par 15 minute block ho jata hai.

---

## 4) Update lagane ka tareeqa

**Sirf 6 files badli hain (+1 nayi):**

```
server.js                        → repo root
public\assets\js\app.js          → public\assets\js
public\assets\js\owner.js        → public\assets\js   (sirf version/copy; badalna zaroori nahi)
public\assets\js\admin.js        → public\assets\js
public\assets\css\app.css        → public\assets\css
public\sw.js                     → public\sw.js       ← NAYI file (zaroori)
public\index.html                → public\index.html  (apple/mobile app meta)
```

1. ZIP extract → ye files repo folder `D:\ZNZ\New folder\ZNZ` mein replace (nayi `sw.js` add)
2. GitHub Desktop → Summary `round 15 final` → **Commit to main** → (Pull aaye to pehle Pull) → **Push origin**
3. Render ▸ **ZNZ** ▸ **Manual Deploy ▸ Deploy latest commit** → Live (2–3 min)
4. Site / admin / owner → **Ctrl + Shift + R**

**Poora folder** laga rahe hain to `POORA-FOLDER-KAISE-LAGAYEIN.txt` follow karein (bas `data` aur `public\uploads` na badlein).

---

## 5) Check (deploy ke baad)

| Kahan | Kya dikhna chahiye |
|---|---|
| `/api/version` | `"version":"8.2.0"` · `"build":"2026-10-26-r15"` · `"storage":"github"` · `"keepAwake":true` |
| Site → ☰ | sab se neeche **DOWNLOAD APP** button; dabane par install sheet |
| Site ka footer | koi **Admin** link nahi |
| `/admin` `znz2026` / `2026` · `/owner` `admin123` / `998877` | dono khulte hain (URL se) |
| Collection boxes | peeche halke bubbles, cards par aap ka chuna hua effect |

---

## 6) Aage aap ko kuch nahi karna

* Content badalna: `/admin` ya `/owner` se → GitHub par khud save (`storage: github`)
* Restart ke baad bhi same data rehta hai
* Site kabhi nahi soyegi (`keepAwake: true`)
* Client app install kar sakta hai (☰ → Download app)
* Mahine mein ek dafa: `/owner ▸ Backup & restore ▸ Download` (extra safety)

---

## 7) QA jo main ne chalaya (sab pass)

- `npm ci` + boot → `/` `200`, `/api/version` → **8.2.0 / r15**
- `/manifest.webmanifest` → short_name Z&Z, standalone, 3 icons, 2 shortcuts, `start_url /?source=app`
- `/sw.js` → `200 application/javascript` (service worker registered)
- client JS mein **0** admin/owner link, **2** “Download app” hits, **6** background-canvas hits
- ☰ menu screenshot: DOWNLOAD APP button sab se neeche ✔
- install sheet screenshot: “Get the Z&Z app” + 3 step ✔
- `/`, `/admin`, `/owner`, `/look` → `200`; missing media → `404`
- owner/admin login + credential rules (admin → owner = 403; owner → admin reset = ok)
