# Proposal — Recréer Ambianceur (PWA de questions entre amis, en live et anonyme)

## Demande d'origine (transcription vocale corrigée)

> Je souhaite recréer le projet **Ambianceur**. C'était un projet où les gens pouvaient se connecter en live et poser des questions. Les gens pouvaient répondre de manière anonyme et, quand toutes les personnes avaient répondu à la question, on pouvait voir le score. Ça mettait une bonne ambiance.
>
> Par exemple, à la question « Qui verriez-vous le mieux en tutu ? », à la fin on a le résultat : « C'est lui qui serait le mieux en tutu ! ». Ou alors, à une question un peu coquine, je peux répondre de manière anonyme et on découvre : « Je suis surpris que dans cette pièce il y ait trois personnes qui seraient prêtes à faire ça. » C'est l'idée du jeu : on répond à des questions, et ces questions amènent à la découverte des gens qui sont autour de nous.
>
> En termes de stack, le projet d'origine était en **React**, avec un backend fait avec **Hasura** et une base de données **PostgreSQL**. Il y avait aussi une authentification **Clerk** à l'origine. Le but maintenant, c'est de le refaire, éventuellement from scratch. Je pense qu'on garde React pour le front, et qu'on fait une **Progressive Web App (PWA)**. Par contre, sur la stack et sur la façon d'identifier les gens, je te laisse carte blanche sur la vision.
>
> Comment est-ce qu'on authentifie les gens ? Est-ce qu'on a besoin d'une authentification ? Une simple **passkey** suffirait-elle ? Fais des recherches pour voir ce qui serait le plus simple à mettre en place. Une authentification Google en 2026, c'est peut-être un peu *too much* pour un petit projet pour s'amuser.
>
> Pour le backend, Hasura pourquoi pas, mais s'il y a plus simple… Au final les données ne sont pas persistées : le but est juste que les gens s'amusent et enchaînent les questions avec les amis qui sont autour d'eux. Peut-être reconnaître les gens via **Bluetooth** pour qu'ils rejoignent la même partie.
>
> Il faut que ce soit très rapide : je suis sur mon téléphone, je lance l'application (ou le site), je suis identifié d'une manière ou d'une autre — un moyen qui permet de savoir que c'est moi — et je joue directement avec les amis autour de moi. Quand tout le monde a répondu, on voit le résultat pendant quelques secondes, puis on enchaîne. Un truc très dynamique, sans prise de tête, et les données peuvent ensuite être effacées rapidement : pas forcément besoin de les garder, ni d'avoir une base de données. Est-ce qu'on ne peut pas juste transmettre les infos en direct ? Bref, fais-moi des propositions.

## Why

L'Ambianceur d'origine (React + Hasura + PostgreSQL + Clerk) est lourd pour ce qu'il fait : un jeu de soirée éphémère où rien n'a besoin d'être conservé. On le recrée en partant de zéro avec une stack minimale : pas de compte, pas de base de données, une salle temps réel jetable. Rejoindre une partie depuis son téléphone doit prendre moins de 10 secondes.

## What Changes

- Nouvelle PWA React installable (mobile-first, en français), qui remplace entièrement l'ancien projet.
- **Pas d'authentification à compte** : identité légère par appareil (pseudo + avatar emoji + identifiant aléatoire en `localStorage`). Pas de Google, pas de Clerk, pas de passkey dans le MVP (la passkey prouve un compte, or il n'y a aucun compte à protéger).
- **Rejoindre à proximité sans Bluetooth** : le Web Bluetooth ne sait ni annoncer ni découvrir des pairs depuis un navigateur, et n'existe pas sur iOS Safari. On le remplace par un code de salle à 4 lettres, un QR code affiché sur l'écran de l'hôte et un lien partageable.
- **Backend sans base de données** : une salle = un objet en mémoire côté serveur (Cloudflare Durable Object via PartyServer), relié aux joueurs par WebSocket. Il est détruit après inactivité.
- **Boucle de jeu** : question, réponses anonymes, révélation automatique quand tout le monde a répondu (ou au bout du minuteur), résultat affiché quelques secondes, puis question suivante.
- **Deux types de questions** : « Qui de nous… ? » (vote pour un joueur, révèle le gagnant) et « Est-ce que tu… ? » (oui/non, révèle seulement le décompte, par exemple « 3 personnes sur 7 »).
- **Questions** : un paquet intégré par catégories (dont une catégorie « coquin » désactivable), plus des questions proposées en direct par les joueurs.
- **Anonymat garanti côté serveur** : seuls des agrégats sont diffusés, et pas de révélation sous 3 joueurs.

## Capabilities

### New Capabilities
- `player-identity` : identité légère par appareil (pseudo, avatar, identifiant persistant local), reconnexion sans compte.
- `game-room` : création et rattachement aux salles (code, QR, lien), lobby, rôle d'hôte, cycle de vie éphémère.
- `game-round` : déroulé d'une manche (question, réponses anonymes, révélation, enchaînement), types de questions, règles d'anonymat.
- `question-deck` : paquet intégré par catégories, filtrage par l'hôte, questions proposées par les joueurs.
- `pwa-shell` : application installable mobile-first, hors-ligne pour la coque, reconnexion réseau.

### Modified Capabilities
_Aucune : projet repris de zéro, aucune spec existante._

## Impact

- Nouveau dépôt monorepo : `app/` (React + Vite + PWA), `server/` (Cloudflare Worker + Durable Objects), `shared/` (types du protocole).
- Dépendances : React, Vite, `vite-plugin-pwa`, `partyserver` / `partysocket`, `qrcode`, Wrangler. Aucune base de données ni fournisseur d'authentification.
- Hébergement : Cloudflare (Workers et assets statiques), l'offre gratuite suffit pour un usage entre amis.
- Hors périmètre du MVP : comptes, historique de parties, statistiques, modération avancée, multilingue, Bluetooth, écran partagé (TV) façon Jackbox.
- Évolution possible : découverte automatique d'une partie sur le même Wi-Fi (« Partie de Paul à proximité », par IP publique commune). Écartée du MVP car elle échoue en 4G et peut exposer la partie à des inconnus derrière une même IP.
