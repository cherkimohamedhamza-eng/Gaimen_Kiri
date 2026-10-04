# Drive JP — Japan Driving Test Prep

Installable offline web app (PWA) for practising Japan's driving-licence knowledge test in English.
Plain HTML, CSS and JavaScript. No framework, no backend, no accounts. Progress stays on the device.

## Put it on GitHub Pages
1. On github.com create a new **public** repository (for example `drive-jp`).
2. Click **Add file → Upload files**, drag in everything from this folder (keep the `css`, `js` and `icons` folders), then **Commit changes**.
3. Open **Settings → Pages**. Under *Build and deployment* choose **Deploy from a branch**, branch **main**, folder **/ (root)**, and **Save**.
4. After a minute the app is live at https://cherkimohamedhamza-eng.github.io/Gaimen_Kiri/.
5. On Android, open that address in Chrome → ⋮ menu → **Install app**.

## Files
- `index.html` — page shell
- `css/app.css` — design, light and dark themes
- `js/data.js` — all study content (topics, lessons, questions, signs, flashcards)
- `js/app.js` — app logic
- `sw.js` — offline support
- `manifest.webmanifest`, `icons/` — install metadata

## Updating content
Edit `js/data.js`. Keep each question's `id` unchanged so saved progress still matches.
After any change, bump the version in **two** places so installed phones pick it up:
`CACHE` at the top of `sw.js`, and `VERSION` in `js/data.js`.

Unofficial study aid; not the official test questions.
