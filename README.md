# Leanna Jukebox

Leanna Jukebox est une application React destinée à une tablette Android : une interface enfant pour écouter des chansons YouTube, explorer un imagier, jouer à de petits jeux et collectionner des autocollants, ainsi qu'un espace parents protégé par PIN.

- **Frontend** : React 19, TypeScript strict, Vite 8, React Router.
- **Données locales** : IndexedDB avec Dexie. L'application reste utilisable sans compte ni configuration cloud.
- **Synchronisation familiale facultative** : Supabase Auth, Postgres et Realtime.
- **Lecture vidéo** : lecteur officiel YouTube IFrame Player API. L'application n'extrait ni ne télécharge les flux vidéo.

## Démarrage

Prérequis : Node.js 22 ou supérieur et npm.

```bash
npm ci
npm run dev
npm run typecheck
npm run test
npm run build
npm run preview
```

Vite démarre normalement sur `http://localhost:5173`. Sur une tablette Android connectée en USB, le serveur peut être exposé avec `adb reverse tcp:5173 tcp:5173`, puis ouvert dans le navigateur de la tablette.

## Fonctionnalités

### Espace enfant

- Accueil avec accès aux activités et à la bibliothèque musicale.
- Mode musique simplifié et lecteur YouTube intégré.
- Miniatures YouTube cliquables ; la lecture ne démarre qu'après une action explicite de l'enfant.
- Navigation entre les chansons en conservant la liste d'origine.
- Imagier illustré et prononcé en français, organisé par catégories.
- Jeux existants : Ballons, Piano, Cherche et trouve, Compter, Ombres et Mémoire.
- Cinq mini-jeux éducatifs dès 3 ans : couleurs, formes, puzzle à 4 pièces, grand/petit et cris des animaux ; consignes vocales, grandes zones tactiles, sans chronomètre ni pénalité.
- Album d'autocollants gagnés dans les jeux.

### Espace parents

- Accès protégé par PIN local (PBKDF2-SHA256, temporisation persistée).
- Gestion des chansons, catégories et playlists.
- Ajout par URL YouTube et recherche YouTube Data API.
- Réglages de lecture et sauvegarde/restauration JSON.
- Connexion Supabase facultative, accessible uniquement dans « Compte et synchronisation » de l’espace parents. L’accueil enfant reste accessible sans compte et la session cloud est restaurée en arrière-plan.

Le PIN parental, son sel et les compteurs d'échecs restent sur l'appareil. Ils ne sont jamais synchronisés.

## Configuration

Copier `.env.example` vers `.env.local`, puis renseigner uniquement les services souhaités.

| Variable | Usage | Obligatoire |
|---|---|---|
| `VITE_SUPABASE_URL` | URL du projet Supabase | Non |
| `VITE_SUPABASE_ANON_KEY` | Clé publique anon Supabase | Non |
| `VITE_YOUTUBE_API_KEY` | Recherche de vidéos YouTube depuis l'espace parents | Non |

Sans variables Supabase, les données restent locales et l'application n'exige aucun compte. Sans clé YouTube Data API, l'ajout d'une chanson par URL reste disponible ; seule la recherche intégrée est désactivée.

**Sécurité des clés :** toute variable préfixée `VITE_` est intégrée au bundle client. La clé Supabase anon est conçue pour être publique et doit être protégée par les politiques RLS. La clé YouTube Data API est également visible dans le navigateur : restreindre sa clé dans Google Cloud à YouTube Data API v3 et aux origines autorisées. Avant une distribution publique, déplacer cette recherche dans une fonction serveur/Edge Function et retirer la clé du client. Ne jamais placer une clé Supabase `service_role` dans `.env.local` ou dans le frontend.

## Synchronisation familiale Supabase

La synchronisation est optionnelle. Dexie reste la source de données locale utilisée par l'interface ; Supabase permet d'associer une bibliothèque à un compte parent.

1. Créer un projet Supabase et configurer `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY`.
2. Dans le SQL Editor Supabase, appliquer les trois migrations dans l’ordre : schéma initial, Realtime familial, puis journal de synchronisation Phase 2.
3. Activer l'authentification e-mail/mot de passe dans Supabase Auth et configurer la confirmation d'adresse selon le besoin.
4. Déployer sur HTTPS pour les essais multi-appareils.

Appliquer les trois migrations versionnées dans l’ordre chronologique :

1. `supabase/migrations/20261114000000_init_jukebox.sql` — schéma initial et politiques RLS.
2. `supabase/migrations/202611150001_family_realtime_sync.sql` — synchronisation familiale historique et publication Realtime.
3. `supabase/migrations/202611160001_sync_outbox_lww.sql` — journal canonique `sync_records`, reçus idempotents, fonction serveur `merge_sync_record`, tombstones et reprise des bibliothèques déjà présentes.
4. `supabase/migrations/202611170001_photo_album.sql` — bucket privé `family-photos`, table `photo_album` et politiques RLS/Storage par compte parent.
5. `supabase/migrations/202611230001_video_album.sql` — bucket privé `family-videos`, table `video_album` et politiques RLS/Storage par compte parent (vidéos jusqu’à 50 Mo).

Pour un projet Supabase déjà existant, inspecter les migrations appliquées, les tables, contraintes, politiques et publications avant toute intervention. Ne pas réinitialiser les tables à l’aveugle. La troisième migration doit être appliquée après les deux premières ; elle reprend les données des tables historiques dans le journal canonique sans supprimer les anciennes tables.

### Garanties de synchronisation Phase 2

- Les modifications locales sont inscrites dans une outbox Dexie persistante dans la même transaction IndexedDB que les entités concernées.
- Chaque opération possède un UUID et un reçu serveur unique : une reprise après interruption ne réapplique pas une opération déjà acceptée.
- Les suppressions deviennent des tombstones `deleted_at` ; aucune suppression distante n'est déduite d'une liste locale incomplète.
- La fonction serveur fusionne uniquement les champs présents dans chaque opération et leur attribue une version/heure serveur. En cas de conflit, la dernière opération reçue par le serveur gagne champ par champ.
- Les changements Realtime sont appliqués à l'entité concernée ; une réconciliation complète est conservée pour le démarrage et le rattrapage après reconnexion.
- Une opération en attente reste locale hors ligne. Les opérations sont isolées par compte familial ; un changement de compte est bloqué si l'ancienne famille a encore des opérations non envoyées.
- Une synchronisation qui dépasserait 30 % de suppressions dans une catégorie d'entités exige une confirmation parentale depuis les réglages.
- Les autocollants et le compteur de manches réussies des jeux sont maintenant conservés dans IndexedDB et synchronisés. Le PIN, ses compteurs d'échec et le verrouillage restent propres à l'appareil.

**Sémantique LWW :** l'horloge de référence est celle du serveur Supabase au moment où l'opération arrive. Une modification réalisée hors ligne est donc arbitrée lors de sa réception, et non à partir de l'heure locale potentiellement décalée de l'appareil.

**Validation restante :** exécuter les migrations sur un projet Supabase de test et couvrir deux appareils réels/émulés (hors ligne, reconnexion, suppressions concurrentes, changement de compte, cache vide/partiel). Tant que ces scénarios n'ont pas passé les tests d'intégration, ne pas considérer la Phase 2 comme validée en production.

## Données et sauvegardes

Les chansons, playlists, catégories et réglages sont stockés localement dans IndexedDB via Dexie. Les migrations de schéma Dexie doivent être ajoutées avec une nouvelle version dans `src/storage/database.ts`.

L'export JSON inclut les chansons, playlists et catégories. Le PIN et les réglages sensibles ne sont pas exportés. L'import valide le fichier avant de remplacer les données dans une transaction.

Les autocollants gagnés sont stockés dans IndexedDB et synchronisés entre appareils. La progression des manches réussies est également synchronisée. L'export JSON manuel reste limité aux chansons, playlists et catégories ; les autocollants, la progression et le PIN n'y sont pas inclus.

## YouTube et protection de l'enfant

- Utilisation du lecteur officiel YouTube IFrame API et de ses contrôles/liens natifs.
- Aucun téléchargement, aucune extraction de flux, aucune suppression de publicité et aucune lecture en arrière-plan.
- La lecture est mise en pause lorsque l'application devient masquée. Si le parent configure une durée maximale, le lecteur s’arrête à l’échéance et la reprise exige le PIN parental.
- L'espace enfant ne demande pas de saisie de texte ; l'espace parents est protégé séparément par PIN.
- Le lecteur YouTube peut traiter des données techniques même avec `youtube-nocookie.com`. Avant toute distribution publique, publier une politique de confidentialité et vérifier les conditions YouTube, les règles applicables aux contenus destinés aux enfants, le RGPD et les obligations relatives aux cookies.

Le PIN de l'application ne verrouille pas Android. Pour un usage enfant, compléter par l'épinglage d'écran ou le mode kiosque Android et un compte système adapté.

## Tests et intégration continue

`npm run test` lance Vitest et les tests de composants/services. `npm run typecheck` lance TypeScript strict. `npm run build` exécute le typecheck puis le build Vite.

GitHub Actions exécute ces trois contrôles sur les pull requests vers `main` et sur les pushes vers `main`. Le résultat faisant foi est celui du workflow sur le commit concerné ; aucun nombre fixe de tests n'est annoncé ici afin d'éviter une documentation périmée.

## Installation PWA et fonctionnement hors ligne

Le projet fournit maintenant un manifest installable, des icônes adaptées, un service worker et un indicateur réseau/installation.

- La première ouverture doit être effectuée en ligne sur une origine HTTPS ; le service worker met en cache l'app shell et les ressources chargées.
- Les fichiers statiques sont conservés dans le cache local ; les miniatures YouTube déjà consultées sont mises en cache avec une limite.
- Les chansons, catégories, playlists, autocollants et progressions restent dans IndexedDB/Dexie. La synchronisation Supabase se met en pause hors ligne et reprend lorsque le réseau revient.
- Sur Android Chrome : menu **⋮ → Installer l'application** ou bouton **Installer Leanna** lorsqu'il est proposé.
- Sur iOS Safari : **Partager → Sur l'écran d'accueil**.

**Limite hors ligne :** les vidéos YouTube ne sont ni téléchargées ni mises en cache. La lecture vidéo exige une connexion Internet. Le cache hors ligne rend l'application, l'imagier, les jeux et les données locales disponibles, pas les flux vidéo YouTube.

## Android natif (APK)

Capacitor 8 est intégré dans `package.json` et `package-lock.json` avec le plugin App pour le bouton Retour natif.

Depuis Windows, avec Node.js 22+ et Android Studio/SDK installés :

```powershell
npm ci
npm run android:add
npm run android:sync
npm run android:open
npm run android:apk
```

L'APK debug est attendu dans `android/app/build/outputs/apk/debug/app-debug.apk`. Le dossier `android/` est généré par Capacitor sur la machine de développement ; il n'est pas encore commité dans cette branche.

Le bouton Retour Android ramène vers l'accueil enfant et minimise l'application depuis l'accueil. L'épinglage d'écran/Lock Task reste une configuration Android à activer par un adulte. Les essais rotation, reprise audio, stockage et démarrage en mode avion restent à faire sur la tablette cible. Voir `docs/INSTALLATION-ANDROID.md`.
