# MapRouteApp

En webbapp som ritar ut en bilrutt på en karta mellan en start- och slutpunkt. Sök fram platser i fälten **Från** och **Till**, eller klicka direkt på kartan (första klicket blir start, andra blir mål). Markörerna går att dra för att justera. Appen visar sträckan och beräknad restid med bil, och rutter kan sparas i webbläsarens `localStorage` för att visas igen senare.

Byggd med React + Vite och Mapbox (GL JS, Geocoding API v6, Directions API).

## Kom igång lokalt

Kräver Node 22 eller senare och ett [Mapbox-konto](https://account.mapbox.com/).

1. Kopiera `.env.example` till `.env.local` och klistra in din publika Mapbox-token (`pk.…`) efter `VITE_MAPBOX_TOKEN=`. `.env.local` är gitignorerad.
2. Installera och starta:

   ```bash
   npm install
   npm run dev
   ```

3. Öppna adressen som Vite skriver ut (normalt <http://localhost:5173>).

Övriga kommandon: `npm test` (Vitest), `npm run lint` (oxlint), `npm run build` och `npm run preview`.

## Publicering på GitHub Pages

Appen byggs och publiceras av [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) vid varje push till `main` (eller manuellt under Actions). Bygget läser token från GitHub-secret `MAPBOX_TOKEN` och misslyckas med ett tydligt fel om den saknas.

Engångsinställningar:

1. **Pages-källa:** _Settings → Pages → Build and deployment → Source: GitHub Actions_. Eller från terminalen:

   ```bash
   gh api -X POST repos/ErikHellman/MapRouteApp/pages -f build_type=workflow
   ```

2. **Token som secret** (kommandot frågar efter värdet, så det hamnar inte i shell-historiken):

   ```bash
   gh secret set MAPBOX_TOKEN --repo ErikHellman/MapRouteApp
   ```

3. Kör om bygget efter att secret är satt:

   ```bash
   gh workflow run deploy.yml --repo ErikHellman/MapRouteApp
   ```

Appen finns sedan på <https://erikhellman.github.io/MapRouteApp/>.

### Om Mapbox-token

En publik Mapbox-token hamnar alltid i den byggda JavaScript-koden, så den går att läsa av den som öppnar sidan. GitHub-secret håller den borta från källkoden i repot, men det verkliga skyddet är en **URL-begränsning**: skapa en egen token under [Access tokens](https://account.mapbox.com/access-tokens/) med standard-scopes och lägg till `https://erikhellman.github.io/MapRouteApp/` som tillåten URL. Använd den token som secret och en separat (gärna begränsad till `http://localhost:5173`) i `.env.local`.

## Struktur

```
src/
  App.jsx                  tillstånd och logik för punkter, rutt och sparade rutter
  components/              MapView, PlaceSearch, RouteSummary, SavedRoutes
  services/                anrop mot Mapbox (geocoding, directions)
  lib/                     formatering och localStorage-lagring
```

Sparade rutter ligger under nyckeln `maproute.savedRoutes.v1` och innehåller start, mål, sträcka, restid och ruttlinjen, så de visas utan nya API-anrop.
