# Spec Delta

## Purpose

Permettre à un groupe d'amis physiquement réunis de se retrouver très vite dans la même partie éphémère, qui disparaît sans laisser de données quand le jeu s'arrête.

## ADDED Requirements

### Requirement: Création de salle
Le système SHALL permettre à tout joueur de créer une salle. Le créateur en devient l'hôte et la salle reçoit un code unique de 4 lettres majuscules, sans caractères ambigus.

#### Scenario: Création
- **WHEN** un joueur appuie sur « Créer une partie »
- **THEN** une salle est créée, il y entre en tant qu'hôte et le code de la salle s'affiche en grand

#### Scenario: Code lisible
- **WHEN** un code de salle est généré
- **THEN** il ne contient que des lettres majuscules et exclut les lettres facilement confondues (I, O)

### Requirement: Rejoindre par code, QR code ou lien
Le système SHALL permettre de rejoindre une salle en saisissant son code, en scannant un QR code affiché par n'importe quel joueur déjà présent ou en ouvrant un lien partageable contenant le code.

#### Scenario: Rejoindre par lien
- **WHEN** un utilisateur ouvre le lien d'une salle existante
- **THEN** il arrive directement dans le lobby de cette salle, après avoir saisi son pseudo seulement si l'appareil n'en a pas encore

#### Scenario: Rejoindre par QR code
- **WHEN** un utilisateur scanne avec l'appareil photo de son téléphone le QR code affiché dans le lobby
- **THEN** le lien de la salle s'ouvre et il la rejoint

#### Scenario: Code inexistant
- **WHEN** un utilisateur saisit un code qui ne correspond à aucune salle active
- **THEN** l'application affiche « Partie introuvable » et ne crée pas de salle

#### Scenario: Partage natif
- **WHEN** un joueur appuie sur « Inviter » sur un appareil compatible avec le partage natif
- **THEN** la feuille de partage du système s'ouvre avec le lien de la salle

### Requirement: Rejoindre une partie en cours
Le système SHALL accepter les nouveaux joueurs à tout moment. Un joueur arrivé pendant une manche participe à partir de la manche suivante.

#### Scenario: Arrivée en pleine manche
- **WHEN** un joueur rejoint une salle pendant qu'une question est ouverte
- **THEN** il voit la question en cours en spectateur et n'est pas attendu pour la révélation
- **AND** il participe à la manche suivante

### Requirement: Lobby en temps réel
Le système SHALL afficher en temps réel à tous les joueurs de la salle la liste des joueurs présents, avec leur pseudo, leur avatar et l'indication de l'hôte.

#### Scenario: Arrivée d'un joueur
- **WHEN** un joueur rejoint la salle
- **THEN** tous les autres joueurs le voient apparaître dans la liste en moins de 2 secondes

#### Scenario: Départ d'un joueur
- **WHEN** un joueur ferme l'application ou perd la connexion pendant plus de 30 secondes
- **THEN** il est retiré de la liste des joueurs actifs

### Requirement: Rôle d'hôte
Le système SHALL réserver à l'hôte le lancement de la partie, le choix des catégories, le passage forcé à la suite et l'exclusion d'un joueur. Si l'hôte quitte la salle, le rôle SHALL être transféré automatiquement au joueur présent depuis le plus longtemps.

#### Scenario: Lancement
- **WHEN** l'hôte appuie sur « Lancer » avec au moins 3 joueurs présents
- **THEN** la première manche démarre pour tous les joueurs

#### Scenario: Pas assez de joueurs
- **WHEN** moins de 3 joueurs sont présents
- **THEN** le bouton « Lancer » est désactivé et indique le nombre de joueurs manquants

#### Scenario: Départ de l'hôte
- **WHEN** l'hôte est déconnecté depuis plus de 30 secondes
- **THEN** le joueur présent depuis le plus longtemps devient l'hôte et tous les joueurs en sont informés

#### Scenario: Exclusion
- **WHEN** l'hôte exclut un joueur
- **THEN** ce joueur est retiré de la salle et ne peut pas la rejoindre de nouveau avec le même identifiant d'appareil

### Requirement: Capacité de la salle
Le système SHALL limiter une salle à 30 joueurs.

#### Scenario: Salle pleine
- **WHEN** un 31e joueur tente de rejoindre la salle
- **THEN** il reçoit le message « Partie complète » et n'est pas ajouté

### Requirement: Salle éphémère sans persistance
Le système SHALL conserver l'état d'une salle uniquement en mémoire, sans base de données. Une salle sans joueur connecté depuis 10 minutes SHALL être détruite avec toutes ses données (joueurs, réponses, questions proposées).

#### Scenario: Fin de soirée
- **WHEN** tous les joueurs ont quitté la salle depuis 10 minutes
- **THEN** la salle et toutes ses données sont supprimées
- **AND** le code ne mène plus à aucune partie

#### Scenario: Aucune trace durable
- **WHEN** une salle a été détruite
- **THEN** aucune réponse, aucun pseudo et aucune question associés à cette salle ne sont récupérables côté serveur
