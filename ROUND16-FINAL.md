# ROUND 16 — KYA KYA NAYA HAI (8.3.0)

Sab kuch aap ke kehne ke mutabiq. **Aap ko sirf ek folder replace karna hai** — neeche
`KAISE-UPDATE-KAREIN.txt` me 6 asaan steps hain.

---

## 1) ANALYTICS — kitne log aaye, kitne ne app download ki

Owner panel me naya tab: **Analytics — visitors & app**

| Kya dikhta hai | Tafseel |
|---|---|
| Last 7 / 30 / 90 din / **Annual (365)** | ek click me report badal jati hai |
| **Custom dates** | do dates chunein — jitne din chahein (max 365) |
| Visitors | roz kitne log aaye + kitne naye (unique) |
| Page views | kul kitni pages khuli — average per din bhi |
| **App installs** | kitne logon ne app phone par install ki |
| App opens | install ke baad app kitni baar kholi gayi |
| Install button clicks | jitne logon ne "Download app" dabaya |
| iPhone steps | jinhon ne iPhone wala tareeqa parha |
| Mobile / Desktop / Tablet | kis device se log aate hain |
| Busiest hours | din ke kis waqt ziada log aate hain (poster/ads ke liye) |
| Top pages | kaunsa page sab se ziada khula |
| Din ba din tafseel | har din ki poori table |
| **Download CSV** | Excel me kholne ke liye file |

* Dashboard par bhi do naye cards: **"Aaj ke visitors"** aur **"App installs"**.
* Har visitor ka sirf ek chhota **anonymous** record rakha jata hai — device, page, waqt.
  **Naam, number, email, IP kuch nahi.** Client ki privacy safe hai.
* Data GitHub par mehfooz jata hai (`data/analytics.json`), is liye Render ke restart par bhi
  nahi jata. Purana data jitna bhi hai, 400 din tak rakha jata hai.
* **Ginti aaj se shuru hoti hai** — is se pehle ke visitors kahin record nahi thay.

---

## 2) EK DRESS → KAI COLLECTIONS (dobara upload karne ki zarurat nahi)

Admin aur owner dono me dress add/edit karte waqt naya hissa:
**"Also show in these collections" / "Aur kin collections me dikhe"**

* Ek hi baar photos + price + description daalein
* Jitni collections chahein tick kar dein — **barat + party + walima** sab
* Ek hi dress ka record rehta hai: price ya photo badlein to **har jagah** badal jata hai
* Dress list me dikhta hai: *"also in Walima Wear"*
* Delete karein to poochta hai: *"Ye dress in collections me bhi hai… har jagah se delete karein?"*
* Client ke liye har collection me woh dress apni jagah nazar aati hai (Google ke liye bhi alag page)

---

## 3) FOOTER — "Crafted by Cunix Web Developers" + WhatsApp

Pehle footer me *"Crafted with love in Pakistan"* tha. Ab:

> **CRAFTED BY CUNIX WEB DEVELOPERS · 0305 6874078 · [WhatsApp]**

* Us line par click → client ka WhatsApp khul jata hai
* Number: **923056874078** (Pakistan code ke saath)
* Pehla message khud likha hota hai: **"Hello! I want to make a website like this one."**
* Client ko sirf **Send** dabana hota hai

**Badalna ho** to: Owner ▸ **Footer credit** tab — line, number, message, dikhana/chhupana — sab wahan se.

---

## 4) CUSTOM PAGES (bonus — Google ke liye bohat acha)

Owner ▸ **About / Terms / SEO** ▸ **Custom pages**

* Jitne pages chahein: Size Guide, Delivery & Payment, Size Chart, Returns…
* Har page ka apna link: `/p/size-guide` — menu aur footer me khud aa jata hai
* Google ke **sitemap** me bhi shamil hota hai
* Shuru me **About Us** aur **Terms & Conditions** do pages already likhe hue maujood hain
  (professional English). Chahein to unhi ko edit kar lein — ab footer aur menu inhi pages par le jate hain.

---

## 5) CHHOTI BEHTARIYAN

* Footer me duplicate "About Us / Terms" hata diye (pehle do baar aa rahe thay)
* Owner panel ka bool (Haan/Nahi) dropdown theek kiya — ab "Nahi" bhi save hota hai
* `/api/version` → **8.3.0 / build 2026-10-27-r16**

---

## Kya nahi badla (sab wesa hi hai)

Logins URL-only (`/owner`, `/admin`) · Download app button drawer ke neeche ·
bubbles/stars background · 13 layout effects · try-on studio · WhatsApp ordering ·
GitHub storage · backup/restore · keep-awake · SEO/sitemap/robots · 4K images.
