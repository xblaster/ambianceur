# Spec Delta

## Purpose

Offrir une application web mobile installable qui démarre instantanément sur un téléphone et reste jouable malgré un réseau de soirée instable.

## ADDED Requirements

### Requirement: Application installable
L'application SHALL être une Progressive Web App installable sur l'écran d'accueil d'Android et d'iOS, avec son nom, son icône et un affichage plein écran sans barre de navigateur.

#### Scenario: Installation
- **WHEN** un utilisateur ajoute l'application à son écran d'accueil puis la lance
- **THEN** elle s'ouvre en plein écran avec l'icône et le nom « Ambianceur »

#### Scenario: Usage sans installation
- **WHEN** un utilisateur ouvre simplement un lien de salle dans son navigateur
- **THEN** il peut jouer sans installer l'application

### Requirement: Démarrage rapide
L'interface de l'application SHALL être mise en cache sur l'appareil après la première visite, pour que l'écran d'accueil s'affiche sans attendre le réseau.

#### Scenario: Second lancement
- **WHEN** l'utilisateur relance l'application avec un réseau lent ou absent
- **THEN** l'écran d'accueil s'affiche en moins d'une seconde
- **AND** un message indique que la connexion est nécessaire pour rejoindre une partie si le réseau est absent

### Requirement: Interface mobile-first
L'interface SHALL être conçue pour un usage à une main sur téléphone, en portrait : cibles tactiles d'au moins 48 px et textes de question lisibles à bout de bras. Elle SHALL être en français.

#### Scenario: Petit écran
- **WHEN** l'application est affichée sur un écran de 360 px de large
- **THEN** la question et toutes les options de réponse sont visibles sans défilement horizontal

### Requirement: Reconnexion automatique
L'application SHALL détecter la perte de connexion à la salle, l'indiquer au joueur et tenter de se reconnecter automatiquement, sans action de sa part, jusqu'à ce que la salle n'existe plus.

#### Scenario: Coupure courte
- **WHEN** le téléphone perd le réseau quelques secondes, ou l'application passe en arrière-plan puis revient
- **THEN** un indicateur « Reconnexion… » s'affiche, puis l'application retrouve l'état courant de la salle sans recharger la page

#### Scenario: Salle disparue
- **WHEN** la reconnexion échoue parce que la salle a été détruite
- **THEN** l'application ramène le joueur à l'accueil avec le message « Cette partie est terminée »

### Requirement: Écran allumé pendant la partie
L'application SHALL demander à l'appareil de garder l'écran allumé pendant une partie, quand le navigateur le permet.

#### Scenario: Partie en cours
- **WHEN** une partie est en cours sur un navigateur compatible
- **THEN** l'écran du téléphone ne se met pas en veille
