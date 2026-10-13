# Design

## Context

Projet repris de zéro : le dépôt ne contient aucun code. L'ancien Ambianceur (React + Hasura + PostgreSQL + Clerk) n'est pas réutilisé. Motivation et périmètre : voir `proposal.md`. Exigences : voir `specs/`.

Contraintes structurantes :
- aucune donnée ne doit survivre à la soirée, donc pas de base de données ;
- l'anonymat doit tenir face à un joueur curieux qui inspecte le réseau, y compris l'hôte ;
- cible principale : navigateurs mobiles, iOS Safari compris ;
- projet loisir : coût d'hébergement proche de zéro, un seul déploiement.

## Goals / Non-Goals

**Goals:**
- Un seul arbitre neutre par salle, côté serveur, qui détient les réponses et ne diffuse que des agrégats.
- Un protocole temps réel simple, typé et partagé entre client et serveur.
- Un déploiement unique (front statique + serveur temps réel) sur une seule plateforme.

**Non-Goals:**
- Scalabilité au-delà de quelques dizaines de salles simultanées.
- Tests de charge, observabilité avancée, CI/CD sophistiquée.
- Compatibilité avec les navigateurs non evergreen.

## Decisions

### D1. Serveur : Cloudflare Workers + Durable Objects (via PartyServer)
Une salle correspond à une instance de Durable Object adressée par son code. Elle tient l'état en mémoire et gère les WebSockets des joueurs. Le même Worker sert aussi les assets statiques de la PWA.
- *Pourquoi* : le modèle « une salle = un objet vivant, isolé, qui disparaît seul » correspond exactement au besoin. Pas de serveur à maintenir, offre gratuite suffisante, latence faible (instance proche du premier joueur).
- *Alternatives écartées* :
  - **Hasura + PostgreSQL (stack d'origine)** : Hasura exige une base Postgres (métadonnées et données), les subscriptions temps réel lisent des tables, donc les réponses seraient écrites sur disque. L'anonymat reposerait sur des règles de permissions fines (une erreur expose qui a répondu quoi), et les minuteurs et la machine à états exigeraient un service en plus. Trois composants à opérer pour des données qu'on ne veut pas garder.
  - **Kubernetes (Node + `ws`, 1 réplique)** : viable et portable, mais un redéploiement tue les parties en cours et le passage à plusieurs répliques demande un routage par code de salle. Cloudflare évite toute infra à opérer.
  - **Azure Functions + Web PubSub** : sans état, il faudrait stocker l'état de salle (Redis, Table), ce qui réintroduit du stockage et deux services à coordonner.
  - **Node + Socket.io (Fly.io / Render)** : simple, mais un processus à garder vivant, des mises en veille sur les offres gratuites et un état perdu au redémarrage sans gestion de multi-instance.
  - **P2P WebRTC (hôte = arbitre)** : l'appareil de l'hôte verrait toutes les réponses (anonymat cassé), la partie meurt si son écran se met en veille, et il faut de toute façon un serveur de signalisation.
  - **Supabase Realtime / Firebase** : le BaaS impose une base de données, contraire à l'objectif.

### D2. État en mémoire, persistance Durable Object uniquement si nécessaire
L'état de salle vit dans la mémoire de l'instance. On n'utilise pas le stockage du Durable Object, sauf un éventuel « alarm » pour la destruction après 10 minutes d'inactivité. Si l'instance est évincée, la salle est perdue, ce qui est acceptable pour un jeu de soirée.
- *Alternative* : sauvegarder l'état dans le stockage du Durable Object pour survivre aux évictions. Rejeté pour le MVP : plus de code, et on garderait des réponses sur disque, ce qui va contre l'intention de ne rien garder.

### D3. Identité : identifiant d'appareil aléatoire en `localStorage`
`deviceId` (UUID v4), `pseudo` et `avatar` (emoji) en `localStorage`. Le client envoie `deviceId` à la connexion ; le serveur l'utilise pour la reconnexion et l'exclusion.
- *Pourquoi* : zéro friction, rien à stocker côté serveur.
- *Alternatives écartées* : **passkey** (WebAuthn) : prouve la possession d'un compte, alors qu'il n'y en a pas, et exige de conserver les clés publiques côté serveur ; **Google / Clerk** : friction et dépendance disproportionnées.
- *Limite acceptée* : un joueur qui copie le `deviceId` d'un autre peut l'usurper. Risque négligeable entre amis.

### D4. Rejoindre : code de 4 lettres + QR + lien, pas de Bluetooth
Alphabet de 24 lettres (sans I ni O), soit environ 330 000 codes. Lien `https://<domaine>/r/ABCD`. QR généré côté client. Partage via `navigator.share` quand c'est disponible.
- *Pourquoi pas le Bluetooth* : le Web Bluetooth ne permet ni d'annoncer ni de scanner des pairs, seulement de se connecter à un périphérique, et il est absent d'iOS Safari.
- *Collision de code* : à la création, le Worker tente un code aléatoire ; si l'instance correspondante est déjà active, il en tire un autre.
- *Évolution non retenue* : découverte par IP publique commune (voir `proposal.md`).

### D5. Anonymat garanti par construction
Les réponses individuelles (`Map<deviceId, answer>`) ne quittent jamais le Durable Object. Les messages diffusés pendant une manche ne contiennent que l'ensemble des joueurs ayant répondu, jamais leur réponse. À la révélation, seuls les agrégats sont envoyés : décompte des voix par joueur désigné pour un vote, nombre de oui et nombre de réponses pour un oui/non. L'auteur d'une question proposée n'est connu que du serveur, pour appliquer la limite de 3 questions en attente.
- Minimum de 3 participants par manche pour limiter la déduction triviale.
- Les réponses de la manche sont effacées de la mémoire dès la révélation.

### D6. Le serveur fait autorité sur la machine à états
```
 LOBBY --start--> QUESTION --(tous ont repondu | 30 s | hote force)--> REVEAL
   ^                 |  ^                                                  |
   |               skip |                                     8 s (sauf pause)
   |                 v  +--------------------------------------------------+
   +--(stop | plus de questions | < 3 joueurs)-- END
```
Le serveur gère les minuteurs (30 s de réponse, 8 s de révélation) et diffuse les échéances absolues (`deadline`) pour que les clients affichent un compte à rebours sans dériver.

### D7. Protocole : messages JSON typés, partagés dans `shared/`
Union discriminée par `type`, sans validation lourde côté client. Validation côté serveur avec une petite fonction de garde par message ; un message invalide est ignoré.
- Client vers serveur : `join`, `updateProfile`, `setCategories`, `start`, `answer`, `submitQuestion`, `removeQuestion`, `forceReveal`, `skip`, `pause`, `resume`, `kick`, `stop`.
- Serveur vers client : `state` (instantané complet de la vue publique, envoyé à chaque changement), `error`, `kicked`.
- *Pourquoi un instantané complet plutôt que des deltas* : quelques kilo-octets au plus avec 30 joueurs, et la reconnexion revient à recevoir un `state`. Beaucoup plus simple.

### D8. Front : React + Vite + `vite-plugin-pwa`, sans framework d'état
Un seul hook `useRoom(code)` encapsule `partysocket` (reconnexion automatique avec backoff) et expose le dernier `state`. Routage minimal : `/` (accueil et profil), `/r/:code` (salle). Wake Lock API pendant la partie. CSS simple (modules ou fichier unique), pas de bibliothèque de composants.
- *Alternative* : Next.js, Remix. Rejetés : aucun rendu serveur n'est utile, une SPA statique suffit.

### D9. Paquet de questions : JSON versionné dans `shared/`, embarqué dans le Worker
Le tirage a lieu côté serveur, ce qui évite qu'un client modifie le jeu. Format : `{ id, category, type: "vote" | "yesno", text }`.

### D10. Monorepo pnpm
`app/`, `server/`, `shared/` dans un workspace pnpm. En local, `wrangler dev` (serveur) et `vite` (front, proxy WebSocket). Tests unitaires avec **Jest** (+ `@swc/jest`) : logique de salle pure et testable hors Durable Object (fonction `reduce(state, event)`) dans `shared/`, composants React dans `app/` (jsdom + Testing Library). Le test d'intégration du Durable Object utilise Vitest avec `@cloudflare/vitest-pool-workers`, seul outil capable d'exécuter le code dans le runtime Workers ; Vitest est cantonné à `server/`.

## Risks / Trade-offs

- [Éviction d'un Durable Object en pleine partie : la salle est perdue] → Les instances avec des WebSockets actifs sont rarement évincées ; le client affiche « Cette partie est terminée », on recrée une salle en 5 secondes. Acceptable.
- [iOS Safari coupe les WebSockets en arrière-plan] → Reconnexion automatique avec `deviceId` et instantané `state` au retour ; le joueur n'est pas attendu par la révélation pendant son absence.
- [Déduction de réponses en petit groupe ou à l'unanimité] → Minimum de 3 participants ; l'écran d'aide explique que « 0 sur N » et « N sur N » révèlent tout le monde.
- [Questions de joueurs offensantes] → Retrait par l'hôte avant affichage, exclusion de joueur. Pas de modération automatique dans le MVP.
- [Usurpation de `deviceId`] → Accepté (voir D3).
- [Dépendance à Cloudflare] → Logique de jeu isolée dans une fonction pure (D10), portable vers Node + `ws` si besoin.
- [Wake Lock non supporté partout] → Amélioration progressive, sans blocage.

## Migration Plan

Pas de migration : rien de l'ancien projet n'est repris (ni code, ni données). Déploiement avec `wrangler deploy` sur un domaine `*.workers.dev`, puis domaine personnalisé si souhaité. Retour arrière : `wrangler rollback`.

## Open Questions

- Nom de domaine définitif et icône de l'application : sans impact sur l'architecture.
- Contenu exact du paquet de questions (rédaction) : à produire pendant l'implémentation, au format défini en D9.
