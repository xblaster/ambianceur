# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Grand public : des groupes réunis dans la même pièce (amis, collègues, famille, ados compris), de 3 à 30 personnes, chacune sur son propre téléphone. Une personne crée la partie (l'hôte) et la pilote ; les autres la rejoignent en quelques secondes et répondent. Personne n'a de compte, personne n'a installé quoi que ce soit avant la soirée.

Leur job : lancer une ambiance tout de suite, sans préparation ni explication, et découvrir des choses sur les gens autour d'eux.

## Product Purpose

Ambianceur est un jeu de soirée en direct : une question tombe sur tous les téléphones, chacun répond en secret, et le résultat est révélé à tout le monde dès que tout le monde a répondu, puis la question suivante enchaîne.

- « Qui de nous… ? » : chacun vote pour un joueur ; le gagnant est révélé (« C'est Paul qui serait le mieux en tutu »), jamais qui a voté pour qui.
- « Est-ce que tu… ? » : oui ou non ; seul le décompte est révélé (« 3 personnes sur 7 »).

Succès : rejoindre une partie prend moins de 10 secondes depuis un téléphone, les manches s'enchaînent sans temps mort, et les révélations font réagir la pièce.

## Positioning

- L'anonymat est garanti par le serveur, pas promis par l'interface : seuls des totaux sont diffusés, l'auteur d'une question n'est jamais révélé, et rien n'est révélé sous 3 réponses.
- Zéro friction : ni compte, ni installation obligatoire, ni écran partagé. Un code de 4 lettres, un QR ou un lien suffit ; chaque téléphone est à la fois manette et écran.
- Éphémère par construction : aucune base de données, la partie disparaît quand tout le monde est parti.

## Operating Context

- Utilisé debout ou affalé, en soirée, souvent dans le bruit et la pénombre, téléphone à une main, entre deux conversations. L'attention est sur les gens, pas sur l'écran.
- Les téléphones sont hétérogènes (iPhone et Android, petits écrans dès 360 px), en Wi-Fi ou 4G instable ; des joueurs arrivent, partent, verrouillent leur écran pendant une manche.
- L'hôte montre le QR code ou partage le lien ; il peut mettre en pause, passer, révéler, exclure, arrêter, et choisir les catégories.
- Rythme : 30 s pour répondre, 8 s de révélation, enchaînement automatique.
- Diffusion publique et gratuite, par bouche à oreille ; pas de monétisation prévue. Servi sur `https://ambianceur.ambianceur.workers.dev`.

## Capabilities and Constraints

- PWA React installable, en français, mobile d'abord ; la coque fonctionne hors ligne, la partie exige le réseau.
- Identité locale par appareil : pseudo + avatar emoji mémorisés, reconnexion automatique (30 s de grâce).
- Salles : code de 4 lettres (sans I ni O), QR, lien, 30 joueurs max, 3 minimum pour lancer et révéler ; un joueur arrivé en cours de manche regarde et joue à la suivante.
- Questions : paquet intégré de 126 questions en 4 catégories (`soft`, `fun`, `perso`, `coquin`), plus des questions proposées en direct par les joueurs (5 à 140 caractères, 3 en attente max par joueur), validées par l'hôte et intercalées.
- La catégorie coquine est désactivée par défaut et signalée quand elle est active ; avec un public qui inclut des ados, elle reste un choix explicite de l'hôte.
- Hors périmètre actuel : comptes, historique, statistiques, multilingue, Bluetooth, écran partagé (TV), modération avancée.
- Non décidé : âge minimum affiché, mentions légales et politique de confidentialité pour la diffusion publique.

## Brand Commitments

- Nom : « Ambianceur ». Aucun logo, mascotte, couleur, slogan ni élément de l'ancien projet n'est à conserver.
- L'interface tutoie le joueur et parle un français courant, sans jargon technique.

## Evidence on Hand

- Paquet de questions : `shared/src/questions.json` (126 questions).
- Application déployée et testée de bout en bout (Playwright, partie à 4 téléphones simulés).
- Aucun témoignage, aucun chiffre d'usage, aucune presse, aucun test sur vrais téléphones consigné à ce jour : ne rien inventer de ce côté.

## Product Principles

1. Les gens d'abord, l'écran ensuite : chaque écran se comprend d'un coup d'œil et rend vite l'attention à la pièce.
2. L'anonymat ne se négocie pas : aucune fonctionnalité ne doit permettre de déduire qui a répondu quoi.
3. Le rythme fait le jeu : jamais d'attente sans indication de ce qui se passe ni de combien de temps il reste.
4. Rejoindre est instantané : tout ce qui ajoute une étape avant la première question doit se justifier.
5. Pour tout le monde : rien ne doit gêner un ado, un collègue ou un parent tant que l'hôte n'a pas choisi le coquin.

## Accessibility & Inclusion

- Grand public : lisible en faible luminosité et sur petits écrans (360 px), cibles tactiles larges, utilisable à une main.
- L'information ne passe jamais par la seule couleur ; les animations respectent `prefers-reduced-motion`.
- Aucune norme formelle (WCAG) fixée à ce stade.
