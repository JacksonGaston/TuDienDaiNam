# Deployment Guide — PWA + Direct APK

This app ships through two store-free channels:

1. **PWA** (primary, all platforms) — hosted on Cloudflare Pages, installable from the browser, fully offline after first visit.
2. **Signed APK** (Android complement) — attached to GitHub Releases for users who prefer a native install.

---

## 1. PWA build

```bash
cd frontend
npm run build:web     # expo export --platform web + scripts/add-pwa.js
```

`scripts/add-pwa.js` post-processes `dist/`:

- **Flattens `node_modules` assets** — wrangler Pages has a hardcoded
  `**/node_modules` exclusion that cannot be overridden via `.gitignore`.
  Metro places assets (SQLite WASM, react-navigation icons) under
  `dist/assets/node_modules/`, so the build step relocates them to
  `dist/assets/ext/` and rewrites all JS bundle references. This is
  transparent; nothing changes for the SW or the app runtime.
- Generates `dist/sw.js` with a content-hashed cache name and a full precache
  manifest (app shell, JS bundles, `wa-sqlite.wasm`, and the ~13 MB
  `dictionary.db`). Every deploy produces a new cache name; old caches are
  purged on activation.
- Copies `pwa/manifest.webmanifest`, `pwa/icons/`, `pwa/_headers` into `dist/`.
- Injects manifest link, theme-color, iOS meta tags and SW registration into
  `dist/index.html` (idempotent — safe to re-run).

Icons are pre-generated and committed (`npm run icons` regenerates them from
`assets/icon.png`; only needed when the source icon changes).

## 2. Deploy to Cloudflare Pages (free subdomain)

One-time setup:

```bash
npm install -g wrangler
wrangler login
```

Deploy:

```bash
cd frontend
npm run build:web
wrangler pages project create tudiendainam --production-branch main   # once
wrangler pages deploy dist --project-name tudiendainam --branch main
```

> **Note (wrangler v4):** subcommands are space-separated — `pages project
> create`, not `pages project-create`.
>
> **`--branch main` matters:** direct-upload deployments are tagged with your
> current git branch. If the branch doesn't match the project's production
> branch (`main`), the deploy becomes a *preview* deployment with a random
> `.<hash>.tudiendainam.pages.dev` URL instead of production. Always pass
> `--branch main`, or run deploys from a checkout of `main`.

Live at `https://tudiendainam.pages.dev`. HTTPS is automatic (required for
service workers). `pwa/_headers` is copied into `dist/` and sets immutable
caching for hashed assets and no-cache for `sw.js` / `index.html`.

To update: edit code → `npm run build:web` → `wrangler pages deploy dist --project-name tudiendainam --branch main`.
Users get the new version on next online visit (SW activates in background;
second visit uses it).

## 3. Local verification

```bash
cd frontend && npm run build:web
npx serve dist          # any static server at the domain root works
```

Checklist (Chrome DevTools → Application):

- [ ] Manifest loads, icons resolve, "Installable" shown in DevTools
- [ ] Service worker registers and precaches (~15 MB, 20+ entries)
- [ ] Network tab → Offline → reload: app boots, search returns results
- [ ] Lighthouse PWA audit passes

Real devices:

- **Android**: Chrome shows an install banner (also an in-app Install button);
  after installing, airplane mode → app still searches.
- **iOS**: Safari → Share → Add to Home Screen; launch from home screen,
  airplane mode → app still searches. Requires iOS 13+; standalone display,
  storage eviction rules are relaxed for installed apps.

## 4. Signed APK via GitHub Releases

The `apk-preview` profile in `frontend/eas.json` builds an installable APK on
EAS servers (no local Android SDK or macOS needed):

```bash
npm install -g eas-cli
cd frontend
eas login                       # Expo account
eas build:configure             # links this project (once)
eas credentials                 # EAS generates & stores a release keystore (once)
eas build -p android --profile apk-preview
```

Download the APK from the build page, then attach it to a release:

```bash
git tag v1.0.0 && git push origin v1.0.0
gh release create v1.0.0 <downloaded.apk> --title "v1.0.0" --notes "..."
```

Users reach it via the link on the Home screen ("Download APK for Android")
which points to `github.com/JacksonGaston/TuDienDaiNam/releases/latest`.
Android will warn about unknown sources when sideloading — expected for
store-free distribution.

### Keystore notes

- Letting **EAS manage the keystore** is the recommended path (`eas credentials`).
- To sign locally instead:

  ```bash
  keytool -genkeypair -v -keystore release.keystore -alias tudiendainam \
    -keyalg RSA -keysize 2048 -validity 10000
  ```

  Never commit the keystore or its passwords.

## 5. Architecture notes

| Concern | Approach |
|---|---|
| Offline data | SQLite WASM (`expo-sqlite`) deserialized in memory from the cached `.db` asset |
| Offline shell | Service worker precache of every hashed asset; SPA navigation fallback |
| Cache invalidation | Content-hash cache name per deploy; old caches deleted on activate |
| iOS install UX | Manual Add-to-Home-Screen banner (i18n vi/en) since iOS has no install prompt API |
| Android install UX | Captured `beforeinstallprompt` → in-app Install button |
