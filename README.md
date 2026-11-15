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
- Six jeux courts : Ballons, Piano, Cherche et trouve, Compter, Ombres et Mémoire.
- Album d'autocollants gagnés dans les jeux.

### Espace parents

- Accès protégé par PIN local (PBKDF2-SHA256, temporisation persistée).
- Gestion des chansons, catégories et playlists.
- Ajout par URL YouTube et recherche YouTube Data API.
- Réglages de lecture et sauvegarde/restauration JSON.
- Connexion Supabase facultative pour retrouver la bibliothèque sur plusieurs appareils.

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
2. Dans le SQL Editor Supabase, exécuter **une seule fois** `supabase/migrations/202611150001_family_realtime_sync.sql`.
3. Activer l'authentification e-mail/mot de passe dans Supabase Auth et configurer la confirmation d'adresse selon le besoin.
4. Déployer sur HTTPS pour les essais multi-appareils.

La migration versionnée crée les tables `categories`, `songs`, `playlists`, `playlist_songs` et `settings`, active RLS avec une politique limitée à `auth.uid() = user_id`, puis ajoute les tables à la publication `supabase_realtime`.

### À propos de `init_jukebox.sql`

Aucun fichier `init_jukebox.sql` n'est présent dans l'arborescence actuelle du dépôt. Ne cherchez donc pas à exécuter un ancien script portant ce nom en plus de la migration ci-dessus. La migration versionnée `202611150001_family_realtime_sync.sql` est le schéma de référence actuel pour la synchronisation familiale. Si un ancien projet Supabase possède déjà des tables créées par un script historique, inspecter son schéma avant d'appliquer la migration ; ne pas supprimer ni recréer les tables à l'aveugle.

### Limites actuelles de la synchronisation

La synchronisation actuelle déclenche une réconciliation de la bibliothèque et n'est pas encore une réplication transactionnelle complète : pas d'outbox durable ni de tombstones pour toutes les suppressions, et pas de résolution LWW champ par champ garantie. Une modification concurrente ou un appareil local incomplet peut donc présenter un risque de perte de données. Ne pas considérer cette version comme une synchronisation multi-appareils à garanties fortes avant la Phase 2 de la roadmap.

## Données et sauvegardes

Les chansons, playlists, catégories et réglages sont stockés localement dans IndexedDB via Dexie. Les migrations de schéma Dexie doivent être ajoutées avec une nouvelle version dans `src/storage/database.ts`.

L'export JSON inclut les chansons, playlists et catégories. Le PIN et les réglages sensibles ne sont pas exportés. L'import valide le fichier avant de remplacer les données dans une transaction.

Les autocollants gagnés sont actuellement stockés dans `localStorage` sur l'appareil ; ils ne sont pas inclus dans la sauvegarde JSON ni dans la synchronisation familiale.

## YouTube et protection de l'enfant

- Utilisation du lecteur officiel YouTube IFrame API et de ses contrôles/liens natifs.
- Aucun téléchargement, aucune extraction de flux, aucune suppression de publicité et aucune lecture en arrière-plan.
- La lecture est mise en pause lorsque l'application devient masquée.
- L'espace enfant ne demande pas de saisie de texte ; l'espace parents est protégé séparément par PIN.
- Le lecteur YouTube peut traiter des données techniques même avec `youtube-nocookie.com`. Avant toute distribution publique, publier une politique de confidentialité et vérifier les conditions YouTube, les règles applicables aux contenus destinés aux enfants, le RGPD et les obligations relatives aux cookies.

Le PIN de l'application ne verrouille pas Android. Pour un usage enfant, compléter par l'épinglage d'écran ou le mode kiosque Android et un compte système adapté.

## Tests et intégration continue

`npm run test` lance Vitest et les tests de composants/services. `npm run typecheck` lance TypeScript strict. `npm run build` exécute le typecheck puis le build Vite.

GitHub Actions exécute ces trois contrôles sur les pull requests vers `main` et sur les pushes vers `main`. Le résultat faisant foi est celui du workflow sur le commit concerné ; aucun nombre fixe de tests n'est annoncé ici afin d'éviter une documentation périmée.

## Android

Le projet est préparé pour un routage compatible avec un futur packaging Capacitor (`HashRouter`, `base: './'`, configuration `capacitor.config.json`). Capacitor et la plateforme Android doivent encore être installés et validés sur une tablette réelle avant de produire un APK de distribution.
