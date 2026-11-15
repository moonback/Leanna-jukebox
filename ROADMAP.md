# Roadmap Leanna Jukebox

Roadmap remise à niveau le 15 novembre 2026 à partir du dépôt `moonback/Leanna-jukebox`. Les statuts distinguent les fonctionnalités présentes, les risques observés et les travaux non encore validés par une exécution CI.

## 1. État actuel vérifié

### Produit présent dans le code

- **Stack** : React 19, Vite 8, TypeScript strict, Dexie/IndexedDB, Supabase JS, Framer Motion, React Router.
- **Espace enfant** : accueil, bibliothèque musicale, mode simple, lecteur YouTube officiel, imagier illustré, jeux et album d'autocollants.
- **Imagier** : six catégories (animaux, fruits, légumes, véhicules, maison, nature) ; le corpus est défini dans `src/data/imagier.ts`.
- **Jeux** : Ballons, Piano, Cherche et trouve, Compter, Ombres et Mémoire.
- **Espace parents** : PIN PBKDF2-SHA256 avec temporisation persistée, gestion des chansons/playlists/catégories, recherche YouTube, réglages, import/export JSON.
- **Stockage** : Dexie local ; synchronisation Supabase Auth/Postgres/Realtime facultative.
- **Progression** : autocollants stockés dans `localStorage`, actuellement exclus de l'export et de la synchronisation.
- **Android** : configuration préparatoire Capacitor présente, mais APK et mode kiosque non validés sur appareil réel.

### Écarts et risques prioritaires

| # | Constat | Priorité | Phase |
|---|---|---|---|
| 1 | Le test SongCard attendait un ancien libellé et ne correspondait plus à l'ARIA réelle du lien. | P0 | 0 |
| 2 | Le README décrivait une version antérieure et contredisait le code sur les jeux, l'imagier, l'authentification et la synchronisation. | P0 | 0 |
| 3 | Le parcours enfant était auparavant bloqué par AuthGate lorsque Supabase était configuré ; la Phase 1 retire ce blocage et réserve la connexion à l’espace parents. | Élevée | 1 |
| 4 | La synchronisation ne dispose pas encore d'une outbox durable et de tombstones complets ; la réconciliation globale et `deleteMissing` nécessitent une protection contre les caches vides/partiels. | Critique avant usage multi-appareils | 2 |
| 5 | La clé `VITE_YOUTUBE_API_KEY` est embarquée dans le client. Elle doit être déplacée côté serveur avant distribution publique. | Élevée | 5 |
| 6 | Les autocollants et la progression des jeux ne sont pas dans la sauvegarde ni dans la synchronisation. | Moyenne | 2 |
| 7 | Pas de PWA/service worker complet ; Capacitor n'est pas installé et le comportement Android n'est pas validé sur tablette. | Moyenne | 3 |
| 8 | Les jeux et les scénarios de synchronisation nécessitent encore une couverture de tests dédiée ; les parcours principaux de la Phase 1 disposent de garde-fous. | Moyenne | 2 |
| 9 | La qualité de la synthèse vocale dépend des voix installées ; un fallback explicite est désormais affiché. | Faible | 1 |
| 10 | La durée maximale d'écoute déclenche désormais une pause réelle avec reprise protégée par PIN. | Résolu | 1 |

### Vérification d'encodage

`index.html` contient déjà une déclaration `<meta charset="UTF-8">` et les caractères français y sont correctement décodés dans la version du dépôt consultée. Aucun remplacement artificiel n'est nécessaire dans ce fichier. Les fichiers édités doivent rester en UTF-8.

## 2. Phases

### Phase 0 — Remise à niveau et base verte (1 à 2 jours)

**Objectif :** documentation alignée sur le produit réel et contrôles automatiques reproductibles.

- [x] Corriger le test `SongCard.test.tsx` pour vérifier le libellé accessible réel « Lire la vidéo : … », la destination et la miniature.
- [x] Réécrire le README : modes enfant, imagier, jeux, autocollants, espace parents, variables, Supabase et limites connues.
- [x] Vérifier l'encodage de `index.html` : UTF-8 déjà valide, pas de modification inutile.
- [x] Documenter les deux migrations Supabase versionnées et leur ordre d’application (schéma initial puis synchronisation familiale).
- [x] Ajouter GitHub Actions pour `typecheck`, `test` et `build` sur push et pull request vers `main`.
- [ ] Confirmer que le workflow CI passe sur cette branche ; le statut ne peut être déclaré vert qu'après exécution par GitHub Actions.

**Critère de sortie :** workflow vert sur la branche et README conforme au code. Phase en attente du résultat CI.

### Phase 1 — Fiabilité de l'expérience enfant (3 à 5 jours)

**Objectif :** l'enfant arrive toujours sur l'accueil enfant ; aucun écran de connexion ou réglage parent ne doit interrompre son parcours.

- [x] Retirer le blocage global `AuthGate` : l'accueil et les routes enfant sont accessibles sans compte.
- [x] Déplacer la connexion Supabase dans la carte « Compte et synchronisation » des réglages parents ; restaurer la session Supabase en tâche de fond dès le démarrage, sans bloquer l’accueil.
- [x] Mémoriser « Continuer sans compte » dans `localStorage` depuis l’espace parents ; la connexion reste réactivable explicitement.
- [x] Transformer la durée de session en vraie pause du lecteur, avec écran de repos et reprise via le PIN parental.
- [x] Signaler les limites de synthèse vocale : utiliser la voix système si aucune voix française n’est installée et afficher une information accessible ; informer si l’API est absente.
- [x] Découper les pages avec `React.lazy` et `Suspense` pour charger les activités à la demande.
- [x] Renforcer les cibles tactiles à 48 px minimum sur les interfaces tactiles et appliquer globalement `prefers-reduced-motion`.

**Validation restante avant clôture :** exécuter la CI sur la branche, vérifier le poids compressé du chunk initial (objectif indicatif : moins de 250 Ko) et réaliser un contrôle visuel sur la tablette Android cible, notamment le contraste et la reprise par PIN.

### Phase 2 — Synchronisation familiale sûre (5 à 8 jours)

**Objectif :** empêcher la perte de données entre appareils et rendre les conflits explicites.

- [ ] Concevoir des tombstones `deleted_at` et des horodatages serveur cohérents pour toutes les entités synchronisées.
- [ ] Remplacer les suppressions implicites `deleteMissing` par la propagation explicite des suppressions.
- [ ] Ajouter une outbox durable IndexedDB avec opérations rejouables et idempotentes.
- [ ] Résoudre les conflits LWW champ par champ à partir d'une horloge serveur ; conserver l'information de version.
- [ ] Bloquer ou demander confirmation parentale avant tout push susceptible de supprimer plus de 30 % des enregistrements distants.
- [ ] Synchroniser les autocollants et la progression des jeux.
- [ ] Remplacer la réconciliation complète déclenchée par Realtime par l'application incrémentale des changements, avec resynchronisation complète contrôlée.
- [ ] Ajouter des tests d'intégration à deux appareils : hors ligne, retour en ligne, suppressions concurrentes, changement de compte, cache vide et cache partiel.

**Critère de sortie :** scénarios de concurrence et de reprise testés automatiquement sans perte de données.

### Phase 3 — Application installable et hors ligne (4 à 6 jours)

**Objectif :** installer Leanna Jukebox sur la tablette et garantir un démarrage fiable sans réseau.

- [ ] Ajouter manifest PWA, icônes et service worker pour l'interface, l'imagier et les sons.
- [ ] Installer Capacitor et générer un APK debug.
- [ ] Tester sur la tablette Android cible, y compris rotation, reprise, audio et stockage.
- [ ] Documenter/tester l'épinglage d'écran ou le mode Lock Task.
- [ ] Gérer le bouton Retour Android : navigation interne vers l'accueil, sans sortie accidentelle de l'application.

### Phase 4 — Contenu et pédagogie (continu, lots de 2 à 4 jours)

**Objectif :** enrichir les activités sans complexifier le parcours enfant.

- [ ] Ajouter des jeux courts : couleurs, formes, puzzle 4 pièces, tri grand/petit, animaux et leurs cris.
- [ ] Définir des niveaux de difficulté 3, 4 et 5 ans réglables par le parent.
- [ ] Étendre l'imagier (vêtements, corps, objets du quotidien) et enregistrer les prononciations.
- [ ] Créer des albums d'autocollants thématiques et des objectifs facultatifs sans pression.
- [ ] Ajouter un tableau de bord parental local : temps d'activité, jeux préférés et chansons écoutées.
- [ ] Ajouter des playlists intelligentes « Dodo » et « Réveil ».

### Phase 5 — Conformité et mise en production (3 à 5 jours)

**Objectif :** préparer une distribution sécurisée et conforme.

- [ ] Déplacer la recherche YouTube dans une Edge Function Supabase ; retirer `VITE_YOUTUBE_API_KEY` du bundle client.
- [ ] Publier politique de confidentialité et mentions sur les cookies/traceurs techniques du lecteur.
- [ ] Vérifier les conditions YouTube, les règles « Made for Kids », le RGPD et les obligations applicables aux mineurs.
- [ ] Ajouter la suppression du compte et des données associées.
- [ ] Ajouter une journalisation d'erreurs minimisée, sans données personnelles de l'enfant et désactivable.
- [ ] Auditer les politiques RLS, les limites de taille/débit et les sauvegardes.
- [ ] Déployer en HTTPS et publier un test interne Android avant toute diffusion publique.

### Phase 6 — Évolutions à arbitrer

- [ ] Plusieurs profils enfant par famille avec historique isolé.
- [ ] Ajout d'une chanson depuis le téléphone parent, visible sur la tablette en temps réel.
- [ ] Mode nuit, berceuses et minuteur d'extinction.
- [ ] Version iOS via Capacitor.
- [ ] Internationalisation si le public s'élargit.

## 3. Jalons et ordre conseillé

| Jalon | Contenu | Critère de sortie |
|---|---|---|
| M0 | Phase 0 | CI verte et documentation alignée |
| M1 | Phase 1 | L'accueil enfant n'est jamais bloqué par une connexion parent |
| M2 | Phase 2 | Scénarios multi-appareils sans perte, validés automatiquement |
| M3 | Phase 3 | APK installé sur tablette, interface disponible hors ligne |
| M4 | Phase 5 | Recherche YouTube côté serveur et conformité documentée |
| M5 | Phase 4 | Lots de contenu livrés et testés en continu |

**Ordre recommandé :** terminer P0, puis P1 avant de remettre la tablette à l'enfant avec Supabase configuré. Ne pas activer l'usage familial multi-appareils à grande échelle avant P2. P3 peut être mené après P1 si l'installation Android est prioritaire.

## 4. Risques à surveiller

1. **Perte de données de synchronisation** : risque le plus important avant usage multi-appareils ; P2 est un prérequis.
2. **Écran parent visible à l'ouverture** : traiter en P1 avant le prochain usage enfant.
3. **Clé YouTube dans le client** : acceptable uniquement comme raccourci restreint pendant le développement ; déplacer côté serveur avant distribution.
4. **Conformité du lecteur et des contenus enfants** : revue nécessaire avant diffusion publique.
5. **Progression non sauvegardée** : les autocollants restent actuellement locaux et peuvent être perdus à la réinstallation.
