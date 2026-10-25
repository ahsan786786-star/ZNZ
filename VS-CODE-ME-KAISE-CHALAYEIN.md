# Z&Z — VS Code me kaise chalayein (5 steps)

1. **Folder kholein** — VS Code → `File ▸ Open Folder…` → `D:\ZNZ\znz-website`
   (OneDrive / Desktop paths se bachein).
2. **Terminal kholein** — `Terminal ▸ New Terminal` (shortcut: `` Ctrl+` ``).
3. **Packages install karein (sirf pehli baar)**
   ```
   npm install
   ```
4. **Website start karein**
   ```
   node server.js
   ```
   Ya `F5` dabayein (us ke liye `.vscode/launch.json` pehle se mojood hai).
5. **Browser me kholein** → <http://localhost:3000>
   - Storefront: `http://localhost:3000`
   - Admin: `http://localhost:3000/admin` → `admin` / `ZnZ2026` / `2026`
   - Owner: `http://localhost:3000/owner` → `1234567890123` / `admin123` / `998877`

## Aam masle

| Masla | Hal |
|---|---|
| `Cannot find module 'express'` | `npm install` chalayein (folder ke andar) |
| `EADDRINUSE` | Purani window band karein ya `PORT` badal dein |
| Login nahi ho raha | Owner `1234567890123/admin123/998877` · Admin `admin/ZnZ2026/2026` |
| `0.0.0.0:3000` blank | `localhost:3000` likhein |
| Photos upload nahi hoti | File JPG/PNG ho; 40 MB se kam video |
