# 📤 Code GitHub par chadhayein — `ahsan786786-star/znz`

Aap ka repo ban gaya, login bhi ho gaya — **koi galti nahi hui**, sirf tareeqa galat tha:

> ⚠️ GitHub web par agar aap **ek ek file** choose karein to files **folders ke baghair** chadh jati hain
> (`public/assets/img/dresses/barat-1.webp` → sirf `barat-1.webp`). Phir server ko kuch nahi milta.
> Aur **folder upload** ka option browser mein hota hai, magar **drag & drop** se — button se nahi.
> Us ki limit hai **100 files ek dafa mein**, is liye main ne package **3 folders** mein baant diya hai.

---

## ✅ Sab se aasan: 3 folders, 3 drags (10 minute)

### 1) Naya ZIP download karein: **`ZNZ-GitHub-Web-Upload.zip`**
Extract karein — andar ye hoga:

```
UPLOAD-1   (80 files)  → dresses + un ke background-free cut-outs
UPLOAD-2   (70 files)  → fonts, js, css, collection / look / poster images
UPLOAD-3   (32 files)  → logo/pngs, index-admin-owner.html, lib, data, server.js, Dockerfile, render.yaml
README-UPLOAD.txt
```

> In folders ke andar ka rasta pehle se sahi hai (`public/assets/img/...`), is liye GitHub khud
> sahi jagah par rakhta hai. Aap ko kuch rename nahi karna.

### 2) Repo kholein
`https://github.com/ahsan786786-star/znz` → **Add file ▸ Upload files**
(ya us page par "**uploading an existing file**" link)

### 3) `UPLOAD-1` **folder** drag karein
File Explorer se **folder** uthayein (andar ki files nahi!) aur browser ke drop box par chhor dein.
Thodi der mein 80 files ki list aa jayegi → neeche **Commit changes** → **Commit changes**.

### 4) Wahi cheez `UPLOAD-2` ke saath → **Commit changes**

### 5) Wahi cheez `UPLOAD-3` ke saath → **Commit changes**

Bas! Repo page refresh karein. Aise nazar aana chahiye:

```
public/    lib/    data/    server.js    package.json    render.yaml    Dockerfile
```

---

## 🔎 10-second check (zaroor karein)

- [ ] `server.js` repo ke root mein hai
- [ ] `public/assets/img/dresses/` kholein → **80 files** (`barat-1.webp`, `barat-1-cut.webp`, …)
- [ ] `lib/` mein 4 files: `auth.js`, `store.js`, `zip.js`, `ghsync.js`
- [ ] `data/db.json` maujood hai
- [ ] `render.yaml` aur `Dockerfile` root mein hain

Sab ✔? Ab deploy — `SHURU-KAREIN-LIVE.md` **Step 5**, aur wahan apni values:

| Cheez | Aap ki value |
|---|---|
| Repo | `ahsan786786-star/znz` |
| `GH_REPO` (Step 6) | `ahsan786786-star/znz` |
| `GH_TOKEN` (Step 6) | Settings ▸ Developer settings ▸ Fine-grained token ▸ sirf iss repo par **Contents: Read and write** |

---

## 🅱️ Alternative — GitHub Desktop (agar drag se pareshani ho)

1. <https://desktop.github.com> → install → **Sign in to GitHub.com**
2. **File ▸ Clone repository** → `ahsan786786-star/znz` → Clone
3. `ZNZ-Luxury-Bridals-Website.zip` extract karein, aur `znz-website` folder ki **saari files**
   cloned folder mein copy karein (replace)
4. App mein **Commit to main** → **Push origin**

Desktop mein koi 100-files limit nahi — ek hi dafa sab chala jata hai.

## 🅲 Alternative — PowerShell (agar Git installed hai)

```powershell
cd C:\Users\Ahsan\Downloads\znz-website
git init
git add .
git commit -m "Z&Z website"
git branch -M main
git remote add origin https://github.com/ahsan786786-star/znz.git
git push -u origin main
```

---

## 🧯 Masle aur hal

| Jo dikhe | Hal |
|---|---|
| Drag par "Yowza, that's a big file!" | koi file 25 MB se bari — is package mein aisi koi nahi |
| Drag ke baad kuch files gayab | 100 ka limit — us folder ko 2 hisson mein drag karein |
| Files repo ke root mein bikhri hain (folders nahi) | files drag hui thin. Un ko delete karein aur **folder** drag karein |
| `.gitignore` / `.dockerignore` nazar nahi aa rahe | Windows mein hidden hain — View ▸ **Hidden items**. Na ho to koi masla nahi |
| Commit button grey | file list load hone ka intezaar karein, ya page refresh karein |

---

## 🛟 Yaad rakhein — data ka backup

Deploy ke baad `/owner` → **Backup & restore** se poori dukaan ki `.zip` le sakte hain. Free host
restart ho jaye to wahi zip restore kar dein — GitHub token ke baghair bhi data mehfooz.
