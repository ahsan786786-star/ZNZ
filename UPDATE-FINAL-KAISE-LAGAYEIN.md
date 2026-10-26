# ✨ FINAL UPDATE — ye 5 files replace karein, bas

Yeh **aakhri update** hai. Is ke baad koi file badalne ki zaroorat nahi.
Sab kuch panel se chalta hai — admin panel, owner panel, pictures, animation, login.

---

## 1) Kya naya hai (round 13 — final)

| # | Cheez | Faida |
|---|---|---|
| 1 | **Har tasveer full quality** | Admin **ya** owner — jo bhi picture upload kare, server usay **4K (3840 px) tak** WebP quality 92 mein save karta hai, aur sath `-md` (1600 px) aur `-sm` (640 px) bana deta hai. Phone tez, banner sharp. Pehle upload hui tasveeron ki missing sizes app **khud** boot par bana deti hai. |
| 2 | **Poster / tasveer ka toota icon khatam** | Missing image ab `404` deti hai (HTML nahi), aur har `<img>` khud full-size par fallback karta hai. Aap ka naya poster pehli load par dikhta hai — mobile aur laptop dono par. |
| 3 | **Login rules bilkul saaf** | Owner ID/password/PIN **sirf** `/owner` ▸ *Owner security* se. Admin login **sirf** owner badal sakta hai (*Admin control*, apna **owner password** daal kar). Admin khud apna password tab badal sakta hai jab owner *Own username / password / PIN change* tick kare. Change hote hi wo account sign-out ho jata hai (owner sign-in rehta hai). Purana hard-coded master password **hata diya** gaya. |
| 4 | **Collection boxes par halki animation** | Boxes ek ek kar ke fade + slide in, hover par picture par gold shimmer, soft zoom, aur dheema gold border saans leta hai. Sirf transform/opacity (slow phone par bhi smooth) aur “reduced motion” walon ke liye khud band. |
| 5 | **Default logins package mein set** | `admin / znz2026 / 2026` aur `1234567890123 / admin123 / 998877` — pehle din badal lein. |

---

## 2) Update lagane ka tareeqa (3 minute)

ZIP extract karne ke baad us mein **5 files** hain — sirf yehi replace karni hain:

```
server.js
lib\auth.js
public\assets\js\app.js
public\assets\js\owner.js
public\assets\css\app.css
```

1. ZIP extract karein.
2. Apna repo folder kholein: `D:\ZNZ\New folder\ZNZ`
3. Extract wali `server.js` → repo folder mein paste → **Replace the file in the destination**
4. `lib\auth.js` → repo ke `lib` folder mein → **Replace**
5. `public\assets\js\app.js` aur `owner.js` → repo ke `public\assets\js` mein → **Replace**
6. `public\assets\css\app.css` → repo ke `public\assets\css` mein → **Replace**
7. GitHub Desktop → Summary: **`round 13 final`** → **Commit to main** → agar *Pull origin* ka message aaye to pehle **Pull**, phir **Push origin**
8. Render ▸ **ZNZ** ▸ **Manual Deploy ▸ Deploy latest commit** (2–3 min, status **Live**)
9. Site / admin / owner kholein aur **Ctrl + Shift + R** dabayein (mobile: browser cache clear ya incognito)

> **Aage se** Render ▸ Settings ▸ Build & Deploy ▸ **Auto-Deploy = Yes** kar dein —
> phir har commit khud deploy hoga, manual nahi karna padega.

---

## 3) Deploy ke baad 3 cheezein check karein

| Kahan | Kya dikhna chahiye |
|---|---|
| `https://znz.onrender.com/api/version` | `"version":"8.0.0"`, `"storage":"github"`, `"keepAwake":true` |
| `/owner` ▸ *Dashboard* | **Site status** card: version, uptime, `GitHub repo (restart-proof ✓)`, Keep awake **on ✓** |
| Site (mobile) | Collection boxes halka animation + aap ka naya poster saaf nazar aaye, koi toota icon nahi |

---

## 4) Ek dafa ka setup (10 minute — phir hamesha ke liye)

### a. Passwords (zaroori)
1. `/owner` → **Owner security** → naya owner ID / password / PIN → Save (dobara login karein)
2. `/owner` → **Admin control** → naya admin username / password / PIN + apna **owner password** → **Update admin login**
   (admin ko dobara sign in karna hoga, aap sign-in rahenge)

### b. Badge (clients ko “online” dikhana)
`/owner` ▸ **Live visitors** → sab se neeche card:
* Clients ko badge dikhayein → **on**
* **Kam se kam kitne dikhein** → misaal `7` (asli visitor kam hon to bhi 7 se neeche nahi jayega)
* Badge ka text → `browsing now`
→ Save. Badge site ke neeche left corner mein aata hai.

### c. Tasveerein / content
`/admin` ya `/owner` se posters, collections, dresses, wallpapers — jo bhi upload karein,
**4K quality** mein save hoga aur foran site par nazar aayega.

### d. Backup (mahine mein ek dafa)
`/owner` ▸ **Backup & restore** ▸ *Download backup (.zip)* → computer / Google Drive mein rakhein.
(Data waise bhi GitHub par save hota hai — `storage: github` — ye extra safety hai.)

### e. Google
`GOOGLE-PAR-KAISE-AYEIN.md` → Search Console mein `https://znz.onrender.com/sitemap.xml` submit karein.

### f. So na jaye (pehle se on hai)
App khud apne aap ko har 10 minute ping karta hai (`keepAwake: true`). Kuch karna nahi.
Renderer ke 750 ghante/mahina ki hadd ka khayal rakhein — ek hi service ke liye theek hai.

---

## 5) Panel se kya kya handle hota hai (sab kuch)

| Kaam | Kahan |
|---|---|
| Posters & hero | `/admin` ▸ Posters (ya owner) |
| Collections add / rename / delete | `/admin` ▸ Collections |
| Dresses, prices, 1–15 photos, videos | `/admin` ▸ Dresses & prices |
| Notice, wheel/grid, VIP popup, home sections | `/admin` ▸ Home sections |
| Try-On backgrounds, wallpapers, layout & motion | owner panel |
| Contact / social / terms / about / branches / SEO | `/admin` ▸ pages + contact |
| Customer inbox (orders, VIP leads, complaints, ratings) | `/admin` ▸ Inbox |
| Kitne log online hain (asli + badge) | `/owner` ▸ Live visitors |
| Admin ke rights (kya kya chhoo sakta hai) | `/owner` ▸ Admin control / Access & privacy |
| Owner ka apna login | `/owner` ▸ Owner security |
| Backup / restore | `/owner` ▸ Backup & restore |
| Site status (version, storage, keep-awake) | `/owner` ▸ Dashboard |

---

## 6) Masle aur hal

| Jo dikhe | Hal |
|---|---|
| Admin login “Invalid username, password or PIN” | `/owner` ▸ **Admin control** se naya admin password set karein — purani build ka password kaam nahi karega |
| Picture phir bhi tooti | Hard refresh (**Ctrl + Shift + R**); phir bhi na ho to `/owner` ▸ **Site status** dekh kar bata dein ke version 8.0.0 hai ya nahi |
| Deploy ke baad purana code | Render ▸ **Manual Deploy ▸ Deploy latest commit**, phir browser cache clear |
| Build fail: `Cannot find module 'express'` | Root Directory khali hona chahiye |
| Build fail `sharp` | `NODE_VERSION=20.11.1` ke baad Manual Deploy |
| Data gayab ho gaya | `storage` `local-disk` ho gaya hoga — `GH_REPO`/`GH_TOKEN` check karein, ya aakhri backup restore karein |

---

## 7) Ek line mein

**5 files replace → Commit → Push → Render Manual Deploy → Ctrl + Shift + R.**
Us ke baad: owner password badlein, admin login set karein, badge ki floor rakhein, aur backup lene ki aadat.
Bas — aage koi file badalne ki zaroorat nahi. 🥂
