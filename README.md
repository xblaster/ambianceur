# Ambianceur

Jeu de soirée en PWA : des amis réunis dans la même pièce répondent en secret à des questions sur leur téléphone, et le résultat tombe pour tout le monde dès que chacun a répondu.

- « Qui de nous… ? » : chacun vote pour un joueur, le gagnant est révélé, jamais qui a voté pour qui.
- « Est-ce que tu… ? » : chacun répond oui ou non, seul le décompte est révélé (« 3 personnes sur 7 »).

Pas de compte (pseudo + emoji mémorisés sur l'appareil), pas de base de données : une partie vit en mémoire dans un Durable Object Cloudflare et disparaît quand tout le monde est parti.

Spécifications et choix techniques : `openspec/changes/bootstrap-ambianceur-game/` (proposal, specs, design).

## Structure

| Dossier   | Contenu                                                                                     |
| --------- | ------------------------------------------------------------------------------------------- |
| `shared/` | Protocole, validation, logique de jeu pure (`reduce`), paquet de questions (`questions.json`) |
| `server/` | Worker Cloudflare : API de création de salle + Durable Object `Room` (PartyServer)           |
| `app/`    | PWA React + Vite                                                                            |
| `e2e/`    | Tests de bout en bout Playwright (plusieurs « téléphones » simulés)                         |

## Prérequis

- Node.js 22+ et pnpm 11 (`corepack enable` ou `npm i -g pnpm`)
- Un compte Cloudflare (gratuit) pour déployer

## Lancer en local

```sh
pnpm install
pnpm dev
```

- App (Vite, rechargement à chaud) : http://localhost:5173
- Worker + salles : http://localhost:8787 (Vite y redirige `/api` et `/parties`)

`pnpm dev` construit d'abord l'app une fois, car le Worker sert `app/dist`.

Pour tester sur de vrais téléphones du même Wi-Fi : `pnpm --filter @ambianceur/app dev --host`, puis ouvrir `http://<ip-du-pc>:5173`. Le partage natif, le presse-papiers et le service worker exigent HTTPS hors `localhost` : pour un test complet, utiliser l'URL déployée.

## Tests

```sh
pnpm test        # Jest (shared, app) + Vitest dans le runtime Workers (server)
pnpm typecheck   # TypeScript strict sur les trois paquets
pnpm e2e         # Playwright : partie complète à 4 joueurs, reconnexion, PWA hors ligne
```

Pour jouer les mêmes tests contre un déploiement : `E2E_BASE_URL=https://ambianceur.ambianceur.workers.dev pnpm e2e`.

Avant le premier `pnpm e2e` : `pnpm exec playwright install chromium`.

## Déployer

```sh
pnpm --filter @ambianceur/server exec wrangler login   # une seule fois
pnpm run deploy               # build de l'app + wrangler deploy (`pnpm deploy` seul est une commande pnpm)
```

L'app est servie sur `https://ambianceur.<sous-domaine>.workers.dev`, actuellement **https://ambianceur.ambianceur.workers.dev** (déployée le 13/10/2026 ; la suite e2e passe sur cette URL). Retour arrière : `pnpm --filter @ambianceur/server exec wrangler rollback`.

## Modifier les questions

Les questions sont dans `shared/src/questions.json` (`id`, `category` parmi `soft`, `fun`, `perso`, `coquin`, `type` parmi `vote`, `yesno`, `text`). `pnpm test` vérifie le format et le minimum de 30 questions par catégorie.

## Test réel sur téléphones

À consigner après chaque campagne de test (tâche 5.2) : appareils, navigateurs, résultats.

_Pas encore réalisé._
