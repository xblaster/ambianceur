# Spec Delta

## Purpose

Définir le déroulé d'une manche (question, réponses anonymes, révélation collective, enchaînement automatique) pour que le jeu reste rapide, fluide et sans risque de dévoiler la réponse de quelqu'un.

## ADDED Requirements

### Requirement: Types de questions
Le système SHALL proposer deux types de questions : « vote » (chaque joueur désigne un joueur de la salle, lui-même compris) et « oui/non » (chaque joueur répond oui ou non à son propre sujet).

#### Scenario: Question vote
- **WHEN** une question de type vote s'affiche, par exemple « Qui verrait-on le mieux en tutu ? »
- **THEN** chaque joueur voit la liste des joueurs participant à la manche (pseudo et avatar) et en choisit un

#### Scenario: Question oui/non
- **WHEN** une question de type oui/non s'affiche, par exemple « As-tu déjà dormi à la belle étoile ? »
- **THEN** chaque joueur voit deux gros boutons « Oui » et « Non »

### Requirement: Réponse unique et modifiable avant révélation
Le système SHALL accepter une seule réponse par joueur et par manche. Le joueur SHALL pouvoir la modifier tant que la révélation n'a pas eu lieu.

#### Scenario: Changement d'avis
- **WHEN** un joueur change sa réponse avant la révélation
- **THEN** seule sa dernière réponse est prise en compte

### Requirement: Progression visible sans contenu
Le système SHALL montrer à tous les joueurs combien de participants ont répondu et lesquels, sans jamais montrer ce qu'ils ont répondu.

#### Scenario: Attente des réponses
- **WHEN** 4 joueurs sur 6 ont répondu
- **THEN** tous voient « 4/6 » et une coche sur l'avatar des joueurs ayant répondu
- **AND** aucune information sur le contenu des réponses n'est transmise aux appareils

### Requirement: Révélation déclenchée par la fin des réponses
Le système SHALL révéler le résultat dès que tous les participants de la manche ont répondu, ou à l'expiration d'un minuteur de 30 secondes, ou quand l'hôte force la révélation. Les participants déconnectés ne sont pas attendus.

#### Scenario: Tout le monde a répondu
- **WHEN** le dernier participant connecté répond
- **THEN** le résultat s'affiche simultanément sur tous les appareils

#### Scenario: Retardataire
- **WHEN** le minuteur de 30 secondes expire alors que certains n'ont pas répondu
- **THEN** le résultat est révélé avec les réponses reçues et les absents sont comptés comme « sans réponse »

### Requirement: Résultat d'une question vote
Le système SHALL révéler pour une question vote le classement des joueurs désignés avec le nombre de voix de chacun, en mettant en avant le ou les joueurs ayant reçu le plus de voix. Le système MUST NOT révéler qui a voté pour qui.

#### Scenario: Gagnant unique
- **WHEN** la révélation a lieu et qu'un joueur a reçu le plus de voix
- **THEN** il est mis en avant (« C'est Paul qui serait le mieux en tutu ! ») avec son nombre de voix

#### Scenario: Égalité
- **WHEN** plusieurs joueurs sont à égalité en tête
- **THEN** ils sont tous mis en avant ex aequo

### Requirement: Résultat d'une question oui/non
Le système SHALL révéler pour une question oui/non uniquement le nombre de « oui » sur le nombre de réponses, sans jamais indiquer qui a répondu quoi.

#### Scenario: Décompte
- **WHEN** 3 joueurs sur 7 ont répondu « oui »
- **THEN** tous voient « 3 personnes sur 7 » sans aucune identité associée

#### Scenario: Unanimité
- **WHEN** tous les participants ont répondu de la même manière
- **THEN** le résultat affiche le décompte (par exemple « 7 sur 7 ») ; ce cas, qui dévoile la réponse de chacun, est accepté et connu des joueurs grâce à l'écran d'aide

### Requirement: Anonymat garanti par le serveur
Les réponses individuelles MUST rester côté serveur et ne jamais être transmises à un appareil, y compris à l'hôte. Seuls les agrégats de révélation sont diffusés. Une manche SHALL nécessiter au moins 3 participants.

#### Scenario: Inspection réseau
- **WHEN** un joueur inspecte les messages reçus par son appareil pendant et après une manche
- **THEN** il n'y trouve aucune association entre un joueur et sa réponse

#### Scenario: Participants insuffisants
- **WHEN** le nombre de joueurs connectés tombe sous 3 pendant la partie
- **THEN** la manche en cours est annulée sans révélation et la salle revient au lobby

### Requirement: Enchaînement automatique
Le système SHALL afficher le résultat pendant 8 secondes, puis passer automatiquement à la question suivante. L'hôte SHALL pouvoir mettre en pause l'enchaînement ou passer immédiatement à la suite.

#### Scenario: Enchaînement
- **WHEN** le résultat est affiché depuis 8 secondes et la partie n'est pas en pause
- **THEN** la question suivante s'affiche sur tous les appareils

#### Scenario: Pause
- **WHEN** l'hôte met la partie en pause pendant l'affichage d'un résultat
- **THEN** le résultat reste affiché jusqu'à ce que l'hôte relance

#### Scenario: Passer une question
- **WHEN** l'hôte appuie sur « Passer » pendant une question ouverte
- **THEN** la question est abandonnée sans révélation et la suivante s'affiche

### Requirement: Fin de partie
Le système SHALL terminer la partie quand l'hôte l'arrête ou quand plus aucune question n'est disponible, puis ramener tous les joueurs au lobby de la même salle pour rejouer.

#### Scenario: Plus de questions
- **WHEN** toutes les questions disponibles pour les catégories choisies ont été jouées
- **THEN** un écran « Fin de partie » s'affiche, puis tous les joueurs reviennent au lobby
