# Bantu_In on Replit

## Run

- Use the **Start application** workflow, which runs `npm run dev`.
- Vite listens on `0.0.0.0:5000` and accepts Replit's proxied preview hosts.
- The existing React, TypeScript, Vite, and Firebase structure is unchanged.
- Install dependencies with `npm ci` when setting up a fresh checkout.

## Checks

- `npm run build` checks TypeScript and creates the production site in `dist/`.
- `npm run lint` runs Oxlint.
- The build reports a non-blocking warning about the JavaScript bundle size.

## Firebase

- The app uses its existing Firebase web configuration in `src/firebase.ts`.
- No additional secrets are needed to start the frontend. `SESSION_SECRET` is not used by this client-side app.
- Authentication and data access depend on the existing Firebase project's settings and Firestore rules.
- Login and registration are available in Preview. Signed-in screens and order operations were not verified during import setup.
- `README.txt` describes Firestore rules, but no `firestore.rules` file is included in this import. Do not invent or deploy rules without confirming the intended permissions.