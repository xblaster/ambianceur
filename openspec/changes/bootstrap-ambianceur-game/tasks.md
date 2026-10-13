# Tasks

## 1. Socle du monorepo

- [x] 1.1 Initialiser le workspace pnpm avec `app/`, `server/`, `shared/`, TypeScript strict et Jest à la racine (Vitest limité à `server/`) ; vérifier que `pnpm install` et `pnpm -r exec tsc --noEmit` passent
- [x] 1.2 Créer `server/` (Worker Cloudflare + `partyserver`, `wrangler.toml` avec Durable Object `Room` et assets statiques pointant vers `app/dist`) ; vérifier que `wrangler dev` démarre et répond sur `/`
- [x] 1.3 Créer `app/` (Vite + React + `vite-plugin-pwa` + `partysocket`) avec proxy WebSocket vers `wrangler dev` ; vérifier que `pnpm dev` affiche une page d'accueil vide
- [x] 1.4 Écrire le `README.md` (lancer en local, déployer) ; vérifier que les commandes documentées fonctionnent sur un clone propre

## 2. Protocole et logique de jeu pure (`shared/`)

- [x] 2.1 Définir les types du protocole (messages client et serveur, vue publique `state`, phases LOBBY/QUESTION/REVEAL/END) selon design D6/D7 ; vérifier la compilation
- [x] 2.2 Implémenter les gardes de validation des messages entrants (pseudo 1-20 caractères, question 5-140 caractères, types connus) ; vérifier par des tests unitaires couvrant les cas valides et invalides
- [x] 2.3 Implémenter la fonction pure `reduce(state, event)` pour le lobby : join, reconnexion par `deviceId`, pseudos uniques (suffixe), capacité de 30, hôte et transfert d'hôte, kick, catégories (Coquin désactivée par défaut) ; vérifier par des tests reprenant les scénarios de `player-identity` et `game-room`
- [x] 2.4 Étendre `reduce` pour les manches : start (au moins 3 joueurs), réponse unique modifiable, arrivées en cours de manche en spectateur, révélation quand tous ont répondu, minuteur ou forçage, skip, pause/resume, annulation sous 3 joueurs, fin de partie ; vérifier par des tests reprenant les scénarios de `game-round`
- [x] 2.5 Implémenter le calcul des agrégats (vote : décompte par joueur et ex aequo ; oui/non : oui sur total) et la projection `state` publique sans aucune réponse individuelle ; vérifier par un test qui échoue si une réponse ou un auteur de question apparaît dans la projection
- [x] 2.6 Implémenter le tirage de questions (catégories actives, sans répétition, intercalage des questions de joueurs, limite de 3 en attente par joueur, retrait par l'hôte, auteur masqué) ; vérifier par des tests reprenant les scénarios de `question-deck`
- [x] 2.7 Rédiger le paquet de questions JSON en français (Soft, Fun, Perso, Coquin, au moins 30 par catégorie, mélange vote et oui/non) ; vérifier par un test de schéma et de comptage par catégorie

## 3. Serveur temps réel (Durable Object `Room`)

- [x] 3.1 Brancher `reduce` dans le Durable Object : connexion WebSocket, routage des messages validés, diffusion de `state` à chaque changement, `error` pour les actions refusées, `kicked` pour l'exclusion ; vérifier par un test d'intégration Vitest (pool Workers) avec 3 clients simulés
- [x] 3.2 Gérer les minuteurs serveur (30 s de réponse, 8 s de révélation, 30 s de grâce à la déconnexion, deadlines absolues dans `state`) ; vérifier par des tests avec horloge simulée
- [x] 3.3 Implémenter la création de salle (code de 4 lettres sans I ni O, re-tirage en cas de collision) et la réponse « Partie introuvable » pour un code inconnu ; vérifier par un test d'intégration
- [x] 3.4 Implémenter la destruction de la salle après 10 minutes sans joueur connecté (alarm) et l'effacement des réponses à chaque révélation ; vérifier par un test que l'état est vide et que le code ne mène plus à rien

## 4. Application PWA (`app/`)

- [x] 4.1 Écran d'accueil et profil (pseudo, emoji aléatoire modifiable, `deviceId` UUID en `localStorage`, boutons « Créer » et « Rejoindre par code ») ; vérifier par des tests de composant et la persistance après rechargement
- [x] 4.2 Hook `useRoom(code)` sur `partysocket` (reconnexion automatique, indicateur « Reconnexion… », retour à l'accueil avec « Cette partie est terminée » si la salle a disparu) ; vérifier en coupant `wrangler dev` puis en le relançant
- [x] 4.3 Lobby : liste des joueurs en temps réel, badge hôte, code en grand, QR code, bouton « Inviter » (`navigator.share`), catégories et badge Coquin, bouton « Lancer » désactivé sous 3 joueurs ; vérifier avec 3 onglets
- [x] 4.4 Écran question : vote (grille d'avatars) ou oui/non (deux gros boutons), compte à rebours basé sur la deadline, progression « 4/6 » avec coches, mode spectateur, contrôles hôte (forcer, passer, pause) ; vérifier avec 3 onglets
- [x] 4.5 Écran révélation (gagnant ou ex aequo mis en avant, « 3 personnes sur 7 », mention « Question d'un joueur ») et écran fin de partie ; vérifier avec 3 onglets sur un cycle complet
- [x] 4.6 Formulaire « Proposer une question » (type, 5-140 caractères, limite affichée) et vue hôte de la file avec retrait ; vérifier avec 3 onglets
- [x] 4.7 Écran d'aide « Comment ça marche / anonymat » (explique que l'unanimité révèle tout le monde) accessible depuis l'accueil et le lobby ; vérifier l'affichage
- [x] 4.8 Manifest PWA (nom, icônes, `display: standalone`), mise en cache de la coque par le service worker, Wake Lock pendant la partie ; vérifier l'installabilité par Chrome (`Page.getInstallabilityErrors` vide, Lighthouse n'ayant plus de catégorie PWA) et un lancement hors ligne affichant l'accueil (e2e Playwright)
- [x] 4.9 Passe mobile-first (portrait 360 px, cibles d'au moins 48 px, textes lisibles) ; vérifier dans l'émulation mobile de Chrome sans défilement horizontal

## 5. Déploiement et validation de bout en bout

- [x] 5.1 Déployer avec `wrangler deploy` sur `*.workers.dev` ; vérifier que l'URL publique sert la PWA et que la création de salle fonctionne
- [ ] 5.2 Test réel avec au moins 3 téléphones (dont un iPhone) : rejoindre par QR, jouer 10 manches, verrouiller et déverrouiller un téléphone pendant une manche, installer sur l'écran d'accueil ; consigner les résultats dans le `README.md`
- [x] 5.3 Inspecter les trames WebSocket d'un client pendant une partie complète ; vérifier qu'aucune association joueur-réponse ni aucun auteur de question n'y apparaît
