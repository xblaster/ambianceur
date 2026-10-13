# Spec Delta

## Purpose

Fournir un flux continu de questions adaptées au groupe : un paquet intégré par catégories, choisi par l'hôte, enrichi en direct par les questions des joueurs.

## ADDED Requirements

### Requirement: Paquet intégré par catégories
Le système SHALL embarquer un paquet de questions en français, chacune rattachée à une catégorie et à un type (vote ou oui/non). Le MVP SHALL proposer au moins les catégories « Soft », « Fun », « Perso » et « Coquin », avec au moins 30 questions par catégorie.

#### Scenario: Questions disponibles hors réseau du serveur
- **WHEN** une salle est créée
- **THEN** le paquet intégré est disponible sans dépendre d'un service externe ni d'une base de données

### Requirement: Choix des catégories par l'hôte
L'hôte SHALL pouvoir activer ou désactiver chaque catégorie depuis le lobby. La catégorie « Coquin » SHALL être désactivée par défaut et signalée comme réservée aux adultes.

#### Scenario: Valeurs par défaut
- **WHEN** une salle vient d'être créée
- **THEN** toutes les catégories sont actives sauf « Coquin »

#### Scenario: Activation de Coquin
- **WHEN** l'hôte active la catégorie « Coquin »
- **THEN** tous les joueurs voient dans le lobby un badge indiquant que des questions coquines sont au programme

#### Scenario: Aucune catégorie
- **WHEN** l'hôte désactive toutes les catégories et qu'aucune question de joueur n'est en attente
- **THEN** le bouton « Lancer » est désactivé

### Requirement: Tirage sans répétition
Le système SHALL tirer les questions au hasard parmi les catégories actives et MUST NOT reposer une question déjà jouée dans la même salle.

#### Scenario: Partie longue
- **WHEN** 50 manches ont été jouées dans une salle
- **THEN** aucune question n'est apparue deux fois

### Requirement: Questions proposées par les joueurs
Tout joueur SHALL pouvoir proposer une question à tout moment, en choisissant son type (vote ou oui/non). Le texte SHALL comporter entre 5 et 140 caractères. L'auteur d'une question MUST NOT être révélé aux autres joueurs.

#### Scenario: Proposition
- **WHEN** un joueur soumet une question valide
- **THEN** elle entre dans la file des questions de joueurs et le joueur voit une confirmation
- **AND** quand elle est jouée, elle s'affiche sans nom d'auteur, avec seulement la mention « Question d'un joueur »

#### Scenario: Texte invalide
- **WHEN** un joueur soumet un texte de moins de 5 ou de plus de 140 caractères
- **THEN** la question est refusée avec un message explicatif

#### Scenario: Limite par joueur
- **WHEN** un joueur a déjà 3 questions en attente dans la file
- **THEN** il ne peut pas en proposer de nouvelle avant que l'une d'elles soit jouée ou retirée

### Requirement: Intercalage des questions de joueurs
Le système SHALL prioriser les questions de joueurs en attente : au plus une manche du paquet intégré entre deux questions de joueurs, dans leur ordre d'arrivée.

#### Scenario: File non vide
- **WHEN** des questions de joueurs sont en attente
- **THEN** une question de joueur est jouée au moins une manche sur deux jusqu'à épuisement de la file

### Requirement: Retrait d'une question par l'hôte
L'hôte SHALL pouvoir voir le texte des questions en attente (sans leur auteur) et en retirer une avant qu'elle soit jouée.

#### Scenario: Question déplacée
- **WHEN** l'hôte retire une question en attente
- **THEN** elle disparaît de la file et n'est jamais affichée aux autres joueurs
