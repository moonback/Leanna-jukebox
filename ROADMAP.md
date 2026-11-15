# Roadmap Leanna Jukebox

Roadmap remise à niveau le 15 novembre 2026 à partir du dépôt `moonback/Leanna-jukebox`. Les statuts distinguent les fonctionnalités présentes, les risques observés et les travaux non encore validés par une exécution CI.

## 1. État actuel vérifié

### Produit présent dans le code

- **Stack** : React 19, Vite 8, TypeScript strict, Dexie/IndexedDB, Supabase JS, Framer Motion, React Router.
- **Espace enfant** : accueil, bibliothèque musicale, mode simple, lecteur YouTube officiel, imagier illustré, jeux et album d'autocollants.
- **Imagier** : neuf catégories (animaux, fruits, légumes, véhicules, maison, nature, vêtements, corps, objets du quotidien) ; prononciation française au toucher via la synthèse vocale système.
- **Jeux** : Ballons, Piano, Cherche et trouve, Compter, Ombres, Mémoire, Couleurs, Formes, Puzzle 4 pièces, Grand/Petit et Cris des animaux.
- **Espace parents** : PIN PBKDF2-SHA256 avec temporisation persistée, gestion des chansons/playlists/catégories, recherche YouTube, réglages, import/export JSON.
- **Stockage** : Dexie local ; synchronisation Supabase Auth/Postgres/Realtime facultative.
- **Progression** : autocollants et manches réussies des jeux dans IndexedDB, intégrés à la synchronisation familiale Phase 2 ; exclus de l'export JSON manuel.
- **Android** : configuration préparatoire Capacitor présente, mais APK et mode kiosque non validés sur appareil réel.

### Écarts et risques prioritaires

| # | Constat | Priorité | Phase |
|---|---|---|---|
| 1 | Le test SongCard attendait un ancien libellé et ne correspondait plus à l'ARIA réelle du lien. | P0 | 0 |
| 2 | Le README décrivait une version antérieure et contredisait le code sur les jeux, l'imagier, l'authentification et la synchronisation. | P0 | 0 |
| 3 | Le parcours enfant était auparavant bloqué par AuthGate lorsque Supabase était configuré ; la Phase 1 retire ce blocage et réserve la connexion à l’espace parents. | Élevée | 1 |
| 4 | L'outbox, les tombstones et la fusion LWW serveur sont implémentés ; les tests d'intégration multi-appareils restent indispensables avant usage familial en production. | Critique jusqu'à validation | 2 |
| 5 | La clé `VITE_YOUTUBE_API_KEY` est embarquée dans le client. Elle doit être déplacée côté serveur avant distribution publique. | Élevée | 5 |
| 6 | Les autocollants et les manches réussies sont maintenant synchronisés ; ils restent exclus de l'export JSON manuel. | Résolu côté synchronisation | 2 |
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

- [x] Ajouter le journal cloud canonique `sync_records`, les tombstones `deleted_at` et l'horodatage serveur `server_updated_at` via la migration `202611160001_sync_outbox_lww.sql`.
- [x] Supprimer `deleteMissing` : les suppressions locales sont transmises comme opérations explicites et restent historisées côté cloud.
- [x] Ajouter une outbox Dexie persistante, écrite dans la même transaction locale que les mutations ; UUID d'opération et reçus serveur assurent le rejeu idempotent.
- [x] Fusionner les patches champ par champ dans `merge_sync_record` ; le serveur horodate chaque champ et la dernière opération reçue gagne.
- [x] Exiger une confirmation parentale lorsque le lot contient plus de 30 % de suppressions d'une catégorie d'entités ; l'approbation est liée aux opérations confirmées.
- [x] Synchroniser les autocollants existants (migration depuis `localStorage`) et les manches réussies des jeux.
- [x] Appliquer les événements Realtime à l'entité concernée ; conserver un pull complet contrôlé au démarrage et après reconnexion.
- [x] Isoler l'outbox par compte familial et bloquer le changement de compte si des opérations de la famille précédente restent en attente.
- [ ] Ajouter les tests d'intégration Supabase à deux appareils : hors ligne, retour en ligne, suppressions concurrentes, changement de compte, cache vide et cache partiel.
- [ ] Appliquer la migration sur un projet Supabase de test et vérifier RLS, RPC, publication Realtime et reprise des lignes historiques.

**Validation restante avant clôture :** CI verte, tests d'intégration à deux clients et migration exécutée sur un projet Supabase de test. Les horodatages LWW sont attribués à la réception par le serveur ; une opération hors ligne est arbitrée au moment de son arrivée, pas selon l'horloge locale de l'appareil.

**Critère de sortie :** scénarios de concurrence et de reprise testés automatiquement sans perte de données.

### Phase 3 — Application installable et hors ligne (4 à 6 jours)

**Objectif :** installer Leanna Jukebox sur la tablette et garantir un démarrage fiable sans réseau.

- [x] Ajouter le manifest PWA, les icônes SVG et le service worker : cache de l'app shell, ressources chargées et miniatures YouTube déjà consultées.
- [x] Ajouter la détection online/offline et le bouton d'installation lorsque le navigateur expose `beforeinstallprompt`.
- [x] Documenter l'installation PWA, les limites YouTube hors ligne et la procédure de génération APK : `docs/INSTALLATION-ANDROID.md`.
- [x] Ajouter Capacitor 8 (core, Android, App) et les commandes Windows pour générer/synchroniser/ouvrir l'APK.
- [x] Gérer le bouton Retour Android : les activités reviennent à l'accueil enfant ; depuis l'accueil l'application est minimisée.
- [ ] Générer le dossier Android et l'APK debug sur une machine équipée d'Android Studio/SDK.
- [ ] Tester sur la tablette Android cible : rotation, reprise, audio, IndexedDB et démarrage en mode avion.
- [ ] Tester l'épinglage de l'écran ou le mode Lock Task.

**Limite fonctionnelle hors ligne :** l'application et les données locales sont disponibles après une première ouverture en ligne ; les vidéos YouTube restent en streaming et nécessitent Internet. Le cache ne télécharge jamais de flux vidéo.

### Phase 4 — Contenu et pédagogie (continu, lots de 2 à 4 jours)

**Objectif :** enrichir les activités sans complexifier le parcours enfant.

- [x] Ajouter des jeux courts : couleurs, formes, puzzle 4 pièces, tri grand/petit, animaux et leurs cris (page `MiniJeuxPage`, cinq activités tactiles, consignes vocales et progression locale/synchronisable).
- [ ] Définir des niveaux de difficulté 3, 4 et 5 ans réglables par le parent.
- [x] Étendre l'imagier aux vêtements, parties du corps et objets du quotidien ; prononcer chaque mot en français au toucher via la synthèse vocale du terminal.
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

**Ordre recommandé :** terminer P0 et P1 avant l'usage enfant. La Phase 2 dispose maintenant de son architecture et de son code, mais ne doit pas être considérée comme validée pour la production avant les tests multi-appareils et la migration sur un projet Supabase de test. P3 peut être mené en parallèle après P1.

## 4. Risques à surveiller

1. **Perte de données de synchronisation** : risque le plus important avant usage multi-appareils ; P2 est un prérequis.
2. **Écran parent visible à l'ouverture** : traiter en P1 avant le prochain usage enfant.
3. **Clé YouTube dans le client** : acceptable uniquement comme raccourci restreint pendant le développement ; déplacer côté serveur avant distribution.
4. **Conformité du lecteur et des contenus enfants** : revue nécessaire avant diffusion publique.
5. **Progression** : les autocollants et les manches réussies sont désormais synchronisés, mais restent absents de l'export JSON manuel.
