# Roadmap Leanna Jukebox

Analyse faite le 15 novembre 2026 sur le dépôt `moonback/Leanna-jukebox` (dernier commit : fusion de la PR #8, synchronisation familiale Realtime).

## 1. État des lieux

### Ce qui existe
- **Stack** : React 19, Vite, TypeScript strict, Dexie (IndexedDB), Supabase (auth, sync, Realtime), Framer Motion, HashRouter.
- **Espace enfant** : accueil à 4 tuiles (Musique, Imagier, Jeux, Autocollants), mode musique simple (vidéo fixée en bas), lecteur YouTube IFrame officiel, imagier de 96 images avec voix française.
- **Jeux** : Cherche et trouve, Mémoire, Ballons, Ombres, Compter, Piano, avec écran de célébration et autocollants.
- **Espace parents** : PIN PBKDF2 avec temporisation persistée, gestion des chansons, playlists et catégories, recherche YouTube Data API, sauvegarde et restauration JSON, réglages (durée, volume, plein écran, sons), synchronisation cloud.
- **Qualité** : `tsc --noEmit` passe sans erreur. 116 tests sur 117 passent (13 fichiers).
- **Taille** : un seul bundle JS de 652 Ko (0,65 Mo au total), aucune découpe par route.

### Écarts constatés
| # | Constat | Gravité |
|---|---|---|
| 1 | `SongCard.test.tsx` échoue : le test cherche un lien « Écouter … », la carte expose « Lire la vidéo : … ». | Faible, à corriger tout de suite |
| 2 | Le README est périmé : il annonce « aucun compte, aucun backend », « pas de synchronisation familiale », 9 fichiers de test, et ne mentionne ni les jeux, ni l'imagier, ni le mode simple, ni les autocollants. | Moyenne |
| 3 | `AuthGate` affiche le formulaire de connexion parent dès le lancement si Supabase est configuré et si `sessionStorage` ne contient pas le choix « sans compte ». Une enfant de 3 ans peut tomber sur un écran e-mail/mot de passe. | Élevée |
| 4 | La synchronisation pousse et réconcilie la bibliothèque entière. Pas de tombstones ni d'outbox durable : une suppression concurrente ou une édition simultanée peut perdre des données (limite déjà documentée dans le README). | Élevée avant usage multi-appareils |
| 5 | `pushAll` supprime côté cloud tout ce qui est absent en local (`deleteMissing`). Un appareil à la base vide ou partielle peut vider le cloud. | Élevée |
| 6 | La clé YouTube Data (`VITE_YOUTUBE_API_KEY`) est embarquée dans le bundle client (marquée « shortcut » dans le code). | Moyenne |
| 7 | Les autocollants et la progression des jeux ne sont ni dans la sauvegarde JSON ni dans la sync (vérifier `stickers.ts` et `backup.ts`). | Moyenne |
| 8 | Aucun manifest PWA, aucun service worker, aucun mode hors ligne pour l'app elle-même. Capacitor n'est pas installé. Pas de dossier `public/` (pas d'icônes). | Moyenne |
| 9 | Schéma Dexie en `version(1)` sans stratégie testée de migration. Les réglages « durée d'écoute » ne coupent pas la lecture (simple message). | Faible |
| 10 | Aucun test pour les pages de jeux, la synchronisation (`sync.ts`, 15 Ko) ni `AuthGate`. Pas de CI. | Moyenne |
| 11 | Le texte du `index.html` (meta description) est mal encodé (« â€” », « prÃ©fÃ©rÃ©es »). | Faible |
| 12 | Des chaînes d'interface et de la voix (`speakFrench`) dépendent des voix du navigateur, sans repli si aucune voix française n'est installée. | Faible |

## 2. Roadmap

Estimations en jours de travail d'un développeur. Les phases sont ordonnées par risque et par valeur pour l'enfant.

### Phase 0 : Remise à niveau (1 à 2 jours)
Objectif : base verte et documentation fiable.
- [ ] Corriger `SongCard.test.tsx` (aligner le test sur le libellé « Lire la vidéo : … »).
- [ ] Réécrire le README : mode simple, imagier, jeux, autocollants, sync Supabase, variables d'environnement, nombre réel de tests. Supprimer les affirmations « aucun compte, aucun backend ».
- [ ] Corriger l'encodage de `index.html` (UTF-8 réel).
- [ ] Ajouter une CI GitHub Actions : `typecheck`, `test`, `build` sur chaque PR.
- [ ] Documenter `init_jukebox.sql` face à `family_realtime_sync.sql` (ordre d'application, tables en double éventuelles).

### Phase 1 : Fiabilité de l'expérience enfant (3 à 5 jours)
Objectif : l'enfant ne voit jamais d'écran destiné aux parents.
- [ ] Déplacer la connexion Supabase dans l'espace parents (carte « Compte et synchronisation »). L'app démarre toujours sur l'accueil enfant ; la session se restaure en arrière-plan.
- [ ] Persister le choix « sans compte » dans `localStorage` (et non `sessionStorage`).
- [ ] Verrouillage de durée : option « fin de session » qui met en pause et affiche un écran de repos, protégé par le PIN pour reprendre.
- [ ] Repli vocal : si aucune voix française, afficher le texte et un indicateur discret au lieu d'un silence.
- [ ] Découpage par route (`React.lazy`) pour réduire le bundle initial (objectif < 250 Ko pour l'accueil).
- [ ] Audit d'accessibilité : cibles tactiles ≥ 48 px, contraste, `prefers-reduced-motion` pour les animations flottantes et les feux d'artifice.

### Phase 2 : Synchronisation sûre (5 à 8 jours)
Objectif : aucune perte de données entre appareils.
- [ ] Ajouter `deleted_at` (tombstones) et `updated_at` fiable sur chaque table, côté Supabase et Dexie (migration `version(2)`).
- [ ] Remplacer `deleteMissing` par la propagation explicite des suppressions.
- [ ] Outbox durable dans IndexedDB (liste d'opérations rejouables) à la place du simple indicateur « dirty » en `localStorage`.
- [ ] Résolution des conflits par dernier écrit gagnant, champ par champ, sur `updated_at` serveur.
- [ ] Garde-fou : refuser un `push` qui supprimerait plus de 30 % de la bibliothèque distante sans confirmation parentale.
- [ ] Synchroniser les autocollants et la progression des jeux (nouvelle table, ou champ JSON dans `settings`).
- [ ] Remplacer la réconciliation complète sur chaque événement Realtime par l'application du seul enregistrement modifié.
- [ ] Tests d'intégration de `sync.ts` avec un faux client Supabase (deux appareils, hors ligne, suppression concurrente, changement de compte).

### Phase 3 : Application installable et hors ligne (4 à 6 jours)
Objectif : l'app tourne sur la tablette de Leanna sans navigateur.
- [ ] Manifest PWA, icônes, écran de démarrage, service worker (`vite-plugin-pwa`) pour mettre en cache l'interface, l'imagier et les sons.
- [ ] Installer Capacitor (`@capacitor/core`, `cli`, `android`), générer l'APK, tester sur tablette réelle.
- [ ] Mode kiosque : documenter et tester l'épinglage d'écran, ou ajouter un plugin Lock Task.
- [ ] Gestion propre de la bascule en arrière-plan (pause YouTube, reprise des sons).
- [ ] Bouton Retour Android : retour à l'accueil, jamais sortie de l'app sans PIN.

### Phase 4 : Contenu et pédagogie (continu, 2 à 4 jours par lot)
Objectif : garder l'enfant engagée et mesurer ce qui marche.
- [ ] Nouveaux jeux courts : couleurs, formes, puzzle à 4 pièces, tri (grand/petit), animaux et leurs cris.
- [ ] Niveaux de difficulté par âge (3, 4, 5 ans), réglables par le parent. Le champ « âge minimum » existe déjà sur les cartes de jeux.
- [ ] Imagier : ajouter les catégories vêtements, véhicules, corps, maison. Enregistrer les prononciations pour éviter la dépendance à la voix du navigateur.
- [ ] Autocollants : albums thématiques, objectifs journaliers sans pression.
- [ ] Tableau de bord parent : temps de jeu, jeux préférés, chansons les plus écoutées, stocké localement et synchronisé.
- [ ] Playlists intelligentes : « Dodo » (calmes) et « Réveil » (rythmées), via une étiquette sur les chansons.

### Phase 5 : Conformité et mise en production (3 à 5 jours)
Objectif : distribution en confiance.
- [ ] Déplacer la recherche YouTube vers une Edge Function Supabase (clé côté serveur, quota par compte). Supprimer `VITE_YOUTUBE_API_KEY` du client.
- [ ] Politique de confidentialité, mentions sur les cookies techniques de `youtube-nocookie.com`, revue des conditions de l'API YouTube et de la politique « made for kids ».
- [ ] Supprimer le compte et ses données depuis l'app (droit à l'effacement).
- [ ] Journalisation d'erreurs sans données personnelles (Sentry ou équivalent, désactivable).
- [ ] Revue des politiques RLS Supabase, limites de taille et de débit, sauvegarde automatique de la base.
- [ ] Déploiement HTTPS (Vercel, Netlify ou Cloudflare Pages) et publication Play Store en test interne.

### Phase 6 : Évolutions possibles (à arbitrer)
- Plusieurs profils enfant par famille (prénom, avatar, historique séparé).
- Contrôle parent à distance : ajouter une chanson depuis le téléphone, qui apparaît en temps réel sur la tablette (la base Realtime existe).
- Mode nuit avec berceuses et minuteur d'extinction.
- Version iOS via Capacitor.
- Internationalisation (anglais, arabe) si le public s'élargit.

## 3. Ordre conseillé et jalons

| Jalon | Contenu | Durée cumulée | Critère de sortie |
|---|---|---|---|
| M0 | Phase 0 | 2 j | CI verte, README exact |
| M1 | Phase 1 | 7 j | Aucun écran parent atteignable depuis l'accueil enfant sans PIN |
| M2 | Phase 2 | 15 j | Scénarios deux appareils sans perte, testés automatiquement |
| M3 | Phase 3 | 21 j | APK installé sur la tablette, fonctionne en mode avion |
| M4 | Phase 5 | 26 j | Clé YouTube côté serveur, politique publiée |
| M5 | Phase 4 | continu | Un lot de contenu par itération |

Si la sync multi-appareils n'est pas utilisée tout de suite, on peut passer de M1 à M3 et reporter M2 ; dans ce cas, désactiver la sync par défaut (ne pas afficher `AuthGate` au démarrage).

## 4. Risques principaux
- **Perte de données par la sync** (écarts 4 et 5) : traiter avant tout usage sur deux appareils.
- **Enfant face à un écran parent** (écart 3) : traiter avant le prochain test avec Leanna.
- **Conformité YouTube et « made for kids »** : à valider avant toute distribution hors cercle familial.
- **Dépendance aux voix du navigateur** : les prononciations enregistrées suppriment le risque.
