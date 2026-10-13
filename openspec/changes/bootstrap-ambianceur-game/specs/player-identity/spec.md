# Spec Delta

## Purpose

Identifier un joueur de façon légère, sans compte ni mot de passe, pour qu'il puisse jouer en quelques secondes et être reconnu s'il se reconnecte depuis le même appareil.

## ADDED Requirements

### Requirement: Identité sans compte
Le système SHALL permettre de jouer sans créer de compte, sans email, sans mot de passe et sans fournisseur d'identité tiers. Un joueur est défini par un pseudo, un avatar et un identifiant d'appareil aléatoire.

#### Scenario: Premier lancement
- **WHEN** un utilisateur ouvre l'application pour la première fois
- **THEN** l'application lui demande uniquement un pseudo et lui propose un avatar choisi au hasard (modifiable)
- **AND** aucun écran de connexion ni d'inscription n'est affiché

#### Scenario: Pseudo invalide
- **WHEN** l'utilisateur saisit un pseudo vide, composé uniquement d'espaces ou de plus de 20 caractères
- **THEN** l'application refuse de continuer et indique la contrainte

### Requirement: Identité persistante sur l'appareil
Le système SHALL mémoriser localement sur l'appareil le pseudo, l'avatar et un identifiant d'appareil aléatoire, généré une seule fois, pour les réutiliser lors des lancements suivants.

#### Scenario: Retour sur l'application
- **WHEN** un utilisateur ayant déjà choisi un pseudo rouvre l'application
- **THEN** son pseudo et son avatar sont pré-remplis et il peut rejoindre une partie sans ressaisie

#### Scenario: Modification du profil
- **WHEN** l'utilisateur modifie son pseudo ou son avatar depuis l'accueil
- **THEN** le nouveau profil est mémorisé et utilisé pour les prochaines parties
- **AND** l'identifiant d'appareil reste inchangé

### Requirement: Reconnaissance à la reconnexion
Le système SHALL reconnaître un joueur qui rejoint de nouveau une salle où il était déjà, à partir de son identifiant d'appareil, et lui rendre sa place plutôt que de créer un nouveau joueur.

#### Scenario: Perte de réseau puis retour
- **WHEN** un joueur perd la connexion puis rejoint de nouveau la même salle depuis le même appareil
- **THEN** il retrouve sa place dans la salle, son rôle (hôte ou non) et sa réponse éventuelle à la manche en cours

### Requirement: Unicité des pseudos dans une salle
Le système SHALL garantir que deux joueurs d'une même salle n'affichent pas le même pseudo.

#### Scenario: Pseudo déjà pris
- **WHEN** un joueur rejoint une salle où un autre joueur utilise déjà le même pseudo
- **THEN** le système lui attribue un pseudo distinct (par exemple avec un suffixe « 2 ») visible par tous
