import { defineConfig } from "@playwright/test";

const PORT = 8788;
// E2E_BASE_URL=https://… pour jouer les tests contre un déploiement au lieu du Worker local.
const remote = process.env.E2E_BASE_URL;

// Tests de bout en bout : un contexte de navigateur par joueur (= un téléphone),
// sur le Worker local qui sert le build de l'app et les salles.
export default defineConfig({
  testDir: "./e2e",
  timeout: 120_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: remote ?? `http://localhost:${PORT}`,
    viewport: { width: 360, height: 740 },
    isMobile: true,
    hasTouch: true,
    locale: "fr-FR",
  },
  webServer: remote
    ? undefined
    : {
        command: `pnpm --filter @ambianceur/app build && pnpm --filter @ambianceur/server exec wrangler dev --port ${PORT}`,
        url: `http://localhost:${PORT}`,
        reuseExistingServer: false,
        timeout: 180_000,
      },
});
