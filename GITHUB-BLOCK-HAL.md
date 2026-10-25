# 🔓 "Access is temporarily restricted" — asal wajah aur hal

## Pehle tasalli: aap ka account ban nahi hua

Ye message GitHub ka **bot-protection** (DataDome) hai — matlab GitHub ko laga ke aap ka browser ya
internet "robot jaisa" lag raha hai. Aap ka account delete nahi hua, ban bhi nahi hua. Ye khud hi
kuch ghanton (kabhi 24 ghante) mein khul jata hai.

**Sab se aam wajah:**

* VPN / proxy / "1.1.1.1 WARP" jaisi cheez on ho
* Mobile data ya shared Wi-Fi jahan bohot log ek hi IP par hain
* Ad-blocker / privacy extension ya DevTools (Inspect) khuli hui ho
* Form bohot tezi se bhara gaya (paste + foran click)
* Page ko baar baar refresh karna (is se rok **lambi** ho jati hai)

---

## ✅ Hal #1 — sab se pehle ye 6 cheezein (5 minute, free)

1. **VPN / WARP / proxy band karein** (agar on hai).
2. **Mobile data** par jayein — phone se: Wi-Fi off → mobile data on → phone ke browser mein
   <https://github.com/signup>. *(Sab se zyada kaam karne wala tareeqa.)*
3. **Incognito / private window** kholein (koi extension nahi chalti).
4. Page khula chhor dein **1 ghanta**, phir dobara try karein — refresh-bar-refresh na karein.
5. Form **aaram se** bharein: email type karein, password type karein, username type karein — paste na karein.
6. Agar signup page par **"Continue with Google"** ka button ho to wahi try karein.

> Phir bhi na khule to 24 ghante wait karein. Aap ke case mein aksar yahi cheez kaam karti hai.

---

## ✅ Hal #2 — GitHub chhorein, **GitLab** use karein (waise hi free)

Render (hosting) GitHub ke ilawa **GitLab** aur **Bitbucket** se bhi deploy karta hai — site bilkul
waise hi live hogi, `render.yaml` bhi waisa hi kaam karega.

1. <https://gitlab.com> → **Register** → email + password → email verify (card nahi)
2. Upar right **+** → **New project** → **Create blank project**
   * Project name: `znz-website`
   * Visibility: **Private**
   * **Initialize repository with a README** ka ☑ **hata dein**
   * **Create project**
3. Ab code upload — GitLab par 200 files drag karne se behtar **terminal** hai (Windows: PowerShell,
   Mac: Terminal). Zip khol kar folder ke andar jayein aur ye 6 lines chalayein:

```bash
cd path/to/znz-website
git init
git add .
git commit -m "Z&Z website"
git branch -M main
git remote add origin https://gitlab.com/APNA-USERNAME/znz-website.git
git push -u origin main
```

   *(push par username + password maanga jaye — password ki jagah GitLab ka **Personal Access Token**
   bhi de sakte hain: GitLab ▸ Settings ▸ Access Tokens ▸ scope `write_repository`.)*

4. Render: <https://render.com> → **Get Started** → **GitLab** se sign in → **New +** → **Blueprint** →
   `znz-website` → **Apply**. Baaki sab pehle jaisa (Step 6 ki env variables bhi).

---

## ✅ Hal #3 — bina Git ke bhi ho sakta hai (2 tareeqe)

| Tareeqa | Kaam kaise karta hai | Note |
|---|---|---|
| **Codeberg + Render "Public Git repository"** | <https://codeberg.org> par account (aksar block nahi hota) → repository banayein → **Add file ▸ Upload files** mein poora folder drag karein → Render mein **New ▸ Web Service ▸ Public Git repository** → URL paste → Runtime **Docker** | auto-deploy nahi, har change par Render mein **Manual Deploy** dabana hoga |
| **Hugging Face Spaces** | <https://huggingface.co> par account → **New ▸ Space** → SDK **Docker** → Files mein wahi folder drag karein → build khud chalega (Dockerfile mojood hai) | 200 files drag karna thoda slow; free Space 48 ghante baad so jati hai |

Dono mein **data** ka masla ab hal hai — neeche dekhein.

---

## 🛟 Har free host par data ka hal (naya feature)

Main ne site mein **Backup & restore** bana diya hai — GitHub token ke baghair bhi data bach jata hai:

1. Site khol kar `/owner` → login → left menu **Backup & restore**
2. **Download backup (.zip)** → poori dukaan (settings, collections, dresses, prices, tasveerein)
   ek zip mein aap ke computer par
3. Host restart ho jaye ya space so jaye → wahi page → **Restore from backup** → zip chunein → sab wapis

Isi liye: **free host + ye button = data mehfooz**, chahe GitHub ho ya na ho.
(Agar `GH_REPO` + `GH_TOKEN` set karein to ye khud-ba-khud hota rehta hai — button ki zaroorat nahi.)

---

## 📌 Chhota faisla

* **5 minute:** VPN off → mobile data → incognito → GitHub signup → phir `SHURU-KAREIN-LIVE.md`
* **Nahi khula:** GitLab se wahi 6 commands → Render Blueprint (site bilkul waisi hi)
* **Git bilkul nahi chahiye:** Codeberg + Render public repo URL, ya Hugging Face Space
* **Har soorat mein:** `/owner → Backup & restore` se data mehfooz rakhein
