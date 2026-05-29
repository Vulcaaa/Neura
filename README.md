# Neura — Comprendre l'Intelligence Artificielle

Un site web **éducatif et interactif** qui explique les principes de l'IA à un·e
étudiant·e en informatique : du neurone artificiel au deep learning, en passant par
l'**apprentissage supervisé** et l'**apprentissage par renforcement**.

La particularité : ce ne sont pas que des définitions. Les algorithmes
(descente de gradient, rétropropagation, Q-learning) **s'exécutent réellement en
direct dans le navigateur**, sous les yeux de l'étudiant.

> 100 % HTML / CSS / JavaScript natif. **Aucune dépendance, aucun build, aucune
> connexion réseau requise.** Tout fonctionne hors-ligne.

## ▶️ Lancer le site

Ouvre simplement `index.html` dans un navigateur moderne :

```bash
# directement
xdg-open index.html        # Linux
open index.html            # macOS

# ou via un petit serveur local (optionnel)
python3 -m http.server 8000   # puis http://localhost:8000
```

## 🧭 Contenu pédagogique

| Chapitre | Sujet | Démo interactive |
|---|---|---|
| 01 | Fondations (IA / ML / DL, paradigmes, histoire) | diagramme + frise |
| 02 | Le neurone artificiel | **neurone jouable** : poids, biais, activations tracées |
| 03 | Réseaux & propagation | réseau animé + bille de **descente de gradient** |
| 04 | **Apprentissage supervisé** | **régression linéaire** (gradient descent) + **mini-playground MLP** |
| 05 | **Apprentissage par renforcement** | **agent Q-learning** dans un labyrinthe éditable |
| 06 | Applications & éthique | panorama des usages réels |

## 🔬 Les démos « pour de vrai »

- **Neurone** — somme pondérée `z = Σ wᵢxᵢ + b` puis activation (sigmoïde, tanh,
  ReLU, Leaky), avec tracé de la fonction et point courant.
- **Régression linéaire** — vraie descente de gradient sur l'erreur quadratique
  moyenne ; on clique pour ajouter des points et on regarde la droite s'ajuster.
- **Classifieur (mini-playground)** — un perceptron multicouche `2 → 16 → 16 → 1`
  avec **forward + rétropropagation codés à la main**, optimiseur **SGD mini-batch
  + momentum**, qui apprend une frontière de décision non linéaire (cercle, XOR,
  lunes, spirale) affichée en heatmap.
- **Q-learning** — agent tabulaire qui apprend par essai-erreur à rejoindre la
  sortie en évitant la lave. Affichage en temps réel de la **carte de valeur** et
  de la **politique** ; grille éditable (murs, sortie, lave) ; réglages ε, α, γ.

## 🗂️ Structure

```
index.html            # structure & contenu (FR)
css/styles.css        # design system : thème sombre, glassmorphism, responsive
js/
├── main.js           # navigation, progression, révélations, fond animé du hero
├── neuron.js         # neurone interactif + tracé d'activation
├── network.js        # propagation avant animée + bille de gradient
├── supervised.js     # régression linéaire + MLP (forward/backprop maison)
└── reinforcement.js  # gridworld Q-learning (valeur + politique)
```

## ✅ Qualité

- Vérifié au rendu **headless (Chromium / Playwright)** : 0 erreur console/JS,
  tous les canvas dimensionnés, les 4 démos entraînent réellement, et le layout
  est **responsive** (desktop / mobile, sans débordement horizontal).
- Accessibilité : respect de `prefers-reduced-motion`, navigation au clavier,
  attributs ARIA sur la navigation.

---

*Projet pédagogique. Les algorithmes sont volontairement « faits main » et lisibles
pour servir de support de cours.*
