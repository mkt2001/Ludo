# Ludo Champ — GitHub + Android APK

This is a classic local four-player Ludo prototype built with HTML, CSS, and JavaScript. It is designed for a 15×15 traditional board, four tokens per player, individual dice buttons, selectable token movement, safe squares, captures, exact home finish, and a GitHub Actions workflow that builds a test APK.

## Files
- `index.html` — app layout and four separate dice buttons
- `style.css` — responsive board and player styling
- `script.js` — board rendering and movement rules
- `.github/workflows/build-apk.yml` — GitHub Actions APK build
- `package.json` and `capacitor.config.json` — Capacitor setup

## Put this project on GitHub from a phone
1. Create/open a repository named `ludo-champ`.
2. Upload all files and folders from this project ZIP into the repository root. Make sure `.github/workflows/build-apk.yml` keeps its exact folder path.
3. Commit the files to the `main` branch (or `master`).
4. Open the repository's **Actions** tab. If GitHub asks, enable workflows.
5. Select **Build Ludo Champ APK** → **Run workflow** → **Run workflow**.
6. Wait for the workflow to finish with a green check.
7. Open that workflow run, scroll to **Artifacts**, and download **Ludo-Champ-APK**.
8. Extract the ZIP artifact and install `app-debug.apk` on your Android phone. Android may ask you to allow installing apps from that source.

A push to `main`/`master` that changes one of the listed files also starts a build.

## Important gameplay note
This is a working starter game, not a fully certified tournament implementation. It supports the classic loop, four individual dice buttons, token selection after a roll, six to release a token, safe cells, captures, and home finishing. House rules differ between Ludo variants. Review and test gameplay thoroughly before publishing widely.

## GitHub Pages (optional web version)
In repository Settings → Pages → Build and deployment, select **Deploy from a branch**, choose `main` and `/(root)`, then Save. The web version will be published at the URL shown on the Pages settings screen.

## Offline note
The game logic itself uses no online APIs. It should work when bundled in the APK. Browser-hosted GitHub Pages requires an initial internet connection to load the page.
