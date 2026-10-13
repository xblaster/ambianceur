---
name: Ambianceur
description: Jeu de soirée en direct, imprimé comme une affiche riso à deux encres.
colors:
  paper-night: "#171a3a"
  paper-night-raised: "#20244d"
  fluo-turquoise: "#24d6c3"
  riso-yellow: "#ffe800"
  bone-ink: "#f4f0e6"
  lilac-dim: "#a4a5cc"
typography:
  display:
    fontFamily: "Anybody Variable, Arial Narrow, sans-serif"
    fontSize: "clamp(3.2rem, 17.5vw, 6rem)"
    fontWeight: 900
    lineHeight: 0.85
    letterSpacing: "0.01em"
    fontVariation: "'wdth' 62"
  headline:
    fontFamily: "Anybody Variable, Arial Narrow, sans-serif"
    fontSize: "clamp(1.9rem, 8.6vw, 2.75rem)"
    fontWeight: 800
    lineHeight: 1.02
    letterSpacing: "-0.01em"
    fontVariation: "'wdth' 78"
  title:
    fontFamily: "Anybody Variable, Arial Narrow, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 850
    lineHeight: 1
    letterSpacing: "0.03em"
    fontVariation: "'wdth' 62"
  body:
    fontFamily: "Atkinson Hyperlegible, system-ui, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: 1.4
  label:
    fontFamily: "Anybody Variable, Arial Narrow, sans-serif"
    fontSize: "1.15rem"
    fontWeight: 800
    letterSpacing: "0.04em"
    fontVariation: "'wdth' 70"
rounded:
  none: "0"
  stamp: "50%"
spacing:
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "20px"
components:
  button-primary:
    backgroundColor: "{colors.fluo-turquoise}"
    textColor: "{colors.paper-night}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "10px 18px"
    height: "48px"
  button-primary-hover:
    backgroundColor: "{colors.bone-ink}"
    textColor: "{colors.paper-night}"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.bone-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "10px 18px"
    height: "48px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.lilac-dim}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
  input:
    backgroundColor: "{colors.paper-night-raised}"
    textColor: "{colors.bone-ink}"
    typography: "{typography.body}"
    rounded: "{rounded.none}"
    padding: "12px 14px"
    height: "48px"
  result-plate:
    backgroundColor: "{colors.riso-yellow}"
    textColor: "{colors.paper-night}"
    rounded: "{rounded.none}"
    padding: "5px 12px 3px"
---

# Design System: Ambianceur

## Overview

**Creative North Star: "Le Tirage Riso"**

Chaque écran est une feuille tirée sur papier bleu nuit avec deux encres vives. Le turquoise fait le travail (actions, filets, sélection), le jaune n'arrive que lorsque quelque chose tombe : le résultat, l'urgence du minuteur. Les titres sont composés en capitales très condensées, et la passe turquoise est imprimée légèrement décalée sous le jaune ou le blanc, comme un repérage approximatif de risographie. C'est ce décalage qui porte l'identité, pas un décor.

L'app reste un outil de jeu : on y répond en quelques secondes, dans le noir, à bout de bras. Donc des filets francs plutôt que des cartes, des cellules bord à bord plutôt que des boutons flottants, une seule plaque inversée par écran pour dire où appuyer. Rien d'arrondi, rien de flouté, rien de dégradé.

Le moment signature est le **recalage** de la révélation : « Et c'est… » seul, puis le nom ou le chiffre arrive en deux passes qui se calent l'une sur l'autre, pendant que tous les téléphones vibrent en même temps.

**Key Characteristics:**
- Papier nuit, deux encres vives, texte os.
- Capitales condensées Anybody pour tout ce qui se lit de loin, Atkinson Hyperlegible pour tout ce qui se lit de près.
- Filets de 2 px, angles vifs, aucune ombre floue.
- États en marques imprimées : plein = choisi, creux = libre, pointillé = indisponible.
- Une seule plaque inversée par écran.

## Colors

Deux encres fluo sur un papier nuit, et une encre os pour le texte.

### Primary
- **Turquoise riso** (fluo-turquoise) : l'encre de travail. Plaque d'action principale, filets de section, cellule sélectionnée, passe décalée des titres, barre du minuteur, numéro de question.

### Secondary
- **Jaune riso** (riso-yellow) : l'encre de l'événement. Nom ou chiffre révélé, plaque de score, minuteur dans les 5 dernières secondes, jauge du oui/non, bannière de reconnexion, contour de focus.

### Neutral
- **Papier nuit** (paper-night) : le fond de toutes les pages ; choisi pour une salle tamisée où un écran clair éblouit.
- **Papier nuit relevé** (paper-night-raised) : champs de saisie et feuilles du bas d'écran.
- **Encre os** (bone-ink) : texte courant, contours des boutons secondaires, code de la partie.
- **Lilas éteint** (lilac-dim) : texte secondaire, indices, états désactivés, troisième encre des tampons.

### Named Rules
**La Règle du Jaune Rare.** Le jaune n'apparaît que pour un résultat ou une urgence. Un élément jaune qui n'annonce rien vide la révélation de son effet.

**La Règle Sans Jugement.** Oui et Non ne prennent jamais vert et rouge : ce sont deux cellules jumelles, marquées en turquoise seulement quand on les choisit.

## Typography

**Display Font:** Anybody Variable (avec Arial Narrow en secours)
**Body Font:** Atkinson Hyperlegible (avec system-ui en secours)

**Character:** une grotesque à largeur variable poussée jusqu'à l'extrême condensé pour crier de loin, associée à une linéale dessinée pour la lisibilité basse vision quand il faut lire de près. Les deux polices sont servies par l'app (hors ligne compris).

### Hierarchy
- **Display** (900, largeur 50–62 %, de clamp(3.2rem, 17.5vw, 6rem) jusqu'à 16rem pour le chiffre révélé, interligne 0,8–0,85) : marque, code de partie, nom révélé, chiffre du oui/non, fin de partie. Toujours en capitales, toujours avec la passe turquoise décalée.
- **Headline** (800, largeur 78 %, clamp(1.9rem, 8.6vw, 2.75rem), 1,02) : la question en cours, en casse normale pour rester lisible jusqu'à 140 caractères.
- **Title** (850, largeur 62 %, 1,5rem, capitales) : titres de section (Joueurs, Catégories), compteurs de réponses.
- **Body** (400/700, 1,0625rem, 1,4) : consignes, aide, noms de joueurs, messages.
- **Label** (800, largeur 70 %, 1,15rem, capitales, +0,04em) : boutons, pastilles, minuteur.

### Named Rules
**La Règle de la Passe Décalée.** Tout texte d'affichage reçoit sa passe turquoise décalée de 0,045em × 0,035em, sans flou. Jamais de texte en dégradé.

## Layout

Colonne unique mobile d'abord, 520 px de large au maximum, centrée sur ordinateur, marges de 16 px et respect des zones sûres. Les sections sont séparées par un filet turquoise de 2 px plutôt que posées dans des cartes ; l'espacement suit 8 / 12 / 16 / 20 px. Les actions principales vivent en bas, à portée du pouce : la barre de l'hôte dans le lobby est collée au bas de l'écran. Les grilles de choix (vote, catégories, avatars, type de question) sont des cellules entières bord à bord qui partagent leurs filets.

## Elevation & Depth

Système entièrement plat. La profondeur vient de l'encre : un aplat turquoise ou jaune passe devant le papier, un filet sépare. Les seules superpositions sont les feuilles du bas d'écran (fond relevé, filet turquoise de 4 px en tête) et la bannière de reconnexion.

### Named Rules
**La Règle de l'Encre Plate.** Aucune ombre portée floue, aucun verre dépoli. Le seul décalage autorisé est celui de la passe turquoise sur le texte.

## Shapes

Angles vifs partout (0). Le seul cercle du système est le tampon d'avatar : un anneau d'encre épais, légèrement tourné selon l'encre du joueur (-6°, +5° ou -2°). Les cases d'état des catégories sont des carrés de 18 px, creux ou pleins.

## Components

### Buttons
- **Shape:** angles vifs (0), hauteur minimale 48 px, 64 px pour l'action de lancement.
- **Primary (la plaque):** aplat turquoise, texte papier nuit, capitales condensées. Un seul par écran.
- **Hover / Focus:** la plaque passe en encre os au survol ; focus en contour jaune de 3 px décalé de 2 px ; appui = léger tassement (1 px, 2 px).
- **Secondary:** contour os de 2 px, fond transparent ; au survol, contour et texte turquoise.
- **Ghost:** sans contour, texte lilas éteint.
- **Disabled:** contour en pointillés, texte lilas éteint.

### Tampons (avatars)
- **Style:** anneau d'encre (turquoise, os ou lilas selon le joueur, stable par identifiant), motif du joueur au centre, légère rotation.
- **Tailles:** 40, 60, 88 et 112 px. Grisé à 40 % tant que le joueur n'a pas répondu.

### Cellules de choix
- **Style:** cellules carrées bord à bord à filets partagés (os pour le vote, os atténué pour catégories et formulaires).
- **State:** sélectionnée = aplat turquoise et texte papier ; catégories = case carrée pleine (au programme) ou creuse.

### Inputs / Fields
- **Style:** fond papier relevé, contour os atténué de 2 px, angles vifs.
- **Focus:** contour turquoise. **Error:** message turquoise en gras sous le champ.

### Navigation
- **Style:** barre haute en boutons fantômes (Quitter, Comment ça marche ?), pictogrammes au trait de 2,25 px à bouts carrés.

### Révélation recalée
Le nom (ou le chiffre) arrive à 0,8 s, la passe turquoise glissant depuis un large décalage jusqu'à son repérage final ; le tampon tombe à 0,9 s, la plaque jaune de score à 1,15 s, le classement à 1,3 s ; vibration simultanée de tous les téléphones. Avec « réduire les animations », tout est déjà en place.

## Do's and Don'ts

### Do:
- **Do** garder le fond papier nuit sur tous les écrans.
- **Do** imprimer chaque texte d'affichage avec sa passe turquoise décalée.
- **Do** composer les choix en cellules entières bord à bord.
- **Do** réserver le jaune au résultat et à l'urgence.
- **Do** dessiner les pictogrammes au trait (SVG), jamais avec des emoji ou des caractères.

### Don't:
- **Don't** utiliser de rayon d'angle hors des tampons d'avatar.
- **Don't** utiliser d'ombre floue, de dégradé ou de texte en dégradé.
- **Don't** colorer Oui/Non en vert et rouge.
- **Don't** mettre deux plaques pleines sur un même écran.
- **Don't** composer une question longue en capitales.
