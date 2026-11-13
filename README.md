# Leanna Jukebox — Mes petites chansons préférées

Application web React (Vite + TypeScript) pour qu'une enfant de 3 ans choisisse et regarde ses chansons
préférées sur tablette Android. Les vidéos passent exclusivement par le **lecteur officiel YouTube IFrame Player API**.
Aucun compte, aucun backend, aucune collecte de données personnelles de l'enfant.

## Démarrer

```bash
npm install
npm run dev        # serveur de développement sur http://localhost:5173
npm run typecheck  # TypeScript strict, aucune erreur attendue
npm run test       # tests unitaires et composants (Vitest + Testing Library + fake-indexeddb)
npm run build      # typecheck + build de production dans dist/
npm run preview    # prévisualisation du build
```

Sur une tablette en développement, ouvrez l'application via `localhost` (par exemple avec
`adb reverse tcp:5173 tcp:5173`). Les API `crypto.subtle` (PIN) et `crypto.randomUUID` ne sont pas
disponibles en HTTP sur une adresse IP du réseau local.

## Architecture

```
src/
  app/            App.tsx (initialisation de la base, HashRouter), routes.tsx
  pages/          HomePage (accueil enfant), LibraryPage, SongListPage (favoris, récentes, catégorie, playlist),
                  PlayerPage (lecteur), ParentPage (espace parents)
  components/
    layout/       AppShell, ChildNavigation, ErrorBoundary
    music/        SongCard, SongGrid, CategoryCard, PlaylistCard, MusicPlayer
    parental/     ParentGate (PIN), PinPad, ParentDashboard, SongEditor, PlaylistEditor,
                  CategoryEditor, SettingsPanel, ParentAccessButton
    ui/           Button, Modal, EmptyState, LoadingState, IllustrationPicker
  hooks/          useMusicLibrary, useSettings, useParentAuth, usePlaylists, usePlayer
  services/
    youtube/      youtubeUrlParser (validation des URL), youtubePlayer (IFrame API),
                  youtubeErrors (messages d'erreur), youtubeMetadata (titre via oEmbed)
    sources.ts    listes de lecture (all, favorites, recent, cat:, pl:)
    nowPlaying.ts indicateur de lecture partagé, sound.ts sons facultatifs, errors.ts erreurs centralisées
  security/       pinService (PBKDF2-SHA256, sel, temporisation)
  storage/        database (Dexie), songRepository, playlistRepository, categoryRepository,
                  settingsRepository, backup (export/import/validation), seed (données de démonstration)
  illustrations/  illustrations SVG intégrées (aucun fichier image à charger)
  types/          Song, Playlist, Category, ParentSettings
  styles/         variables (palette, safe areas), global, animations
```

### Données (IndexedDB via Dexie)

| Table | Contenu | Index |
|---|---|---|
| `songs` | `Song` (id, title, youtubeVideoId, categoryId, illustration, favorite, sortOrder, createdAt, updatedAt, lastPlayedAt, isDemo) | `id, categoryId, sortOrder, lastPlayedAt, youtubeVideoId` |
| `playlists` | `Playlist` (id, title, illustration, songIds, sortOrder, createdAt) | `id, sortOrder` |
| `categories` | `Category` (id, title, illustration, sortOrder) | `id, sortOrder` |
| `settings` | `ParentSettings`, clé unique `parent` (hash et sel du PIN, compteur d'échecs, réglages) | `key` |

- `favorite` n'est pas indexé (IndexedDB n'indexe pas les booléens) : le filtre se fait en mémoire.
- **Migrations** : le schéma est en `version(1)`. Toute évolution ajoute une nouvelle `version(n)` avec ses
  fonctions `upgrade` dans `storage/database.ts`. `schemaVersion` dans les réglages sert de repère.
- Les hooks `useLiveQuery` (dexie-react-hooks) mettent l'interface à jour à chaque écriture.
- Les dépôts reçoivent la base en paramètre : ils sont testables sans navigateur et pourront,
  plus tard, être remplacés par une implémentation Supabase pour une synchronisation familiale.

## Parcours enfant

- **Accueil** : logo, message, accès rapides (Favoris, Playlists, Dernières), catégories, grille de chansons.
- **Une chanson** : un appui sur la carte ouvre le lecteur. La vidéo se charge, mais **la lecture démarre
  uniquement après un appui sur le grand bouton Lecture** (action explicite, et évite les blocages d'autoplay).
- **Suivant / précédent** restent dans la liste d'origine (catégorie, playlist, favoris…).
- Aucun champ de texte dans l'espace enfant. Navigation en bas à trois cibles.

## Lecteur YouTube et conformité

- Script officiel `https://www.youtube.com/iframe_api`, iframe du domaine `youtube-nocookie.com`.
- Les commandes de l'application sont **à l'extérieur** de l'iframe ; rien ne la recouvre. Le lien
  « Regarder sur YouTube » et les contrôles natifs restent visibles.
- Aucune extraction de flux, aucun téléchargement, aucune suppression de publicité, aucune lecture en arrière-plan :
  la vidéo se met en pause lorsque l'application n'est plus visible (`visibilitychange`).
- Erreurs gérées (`youtubeErrors.ts`) : code 2 (paramètre invalide), 5 (lecteur HTML5), 100 (vidéo supprimée ou privée),
  101/150/153 (lecture interdite dans un lecteur intégré), absence de réseau et délai de chargement du script.
  Chaque erreur affiche un message adapté à l'enfant, un bouton de retour, et un réessai lorsque c'est pertinent.
- Titre automatique : endpoint oEmbed officiel (`youtube.com/oembed`), sans scraping. En cas d'échec, le parent saisit le titre.
- Chansons de démonstration : `Démo : …` marquées `isDemo`, **sans identifiant vidéo**. Elles affichent un message
  « chanson d'exemple » et ne sont jamais présentées comme jouables.

## Validation des liens

`services/youtube/youtubeUrlParser.ts` accepte `youtube.com/watch?v=`, `youtu.be/`, `youtube.com/embed/`,
`youtube.com/shorts/` et `youtube.com/live/`. L'hôte est comparé **exactement** à une liste blanche
(`youtube.com`, `www.youtube.com`, `m.youtube.com`, `youtu.be`) : `youtube.com.evil.com` et `evilyoutube.com` sont refusés.
L'identifiant doit faire exactement 11 caractères `[A-Za-z0-9_-]`.

## Espace parents et PIN

- **Première utilisation** : création d'un PIN de 4 à 6 chiffres, puis confirmation.
- **Stockage** : PBKDF2-SHA256 (200 000 itérations, `security/pinService.ts`) avec un sel aléatoire de 16 octets.
  Le PIN n'est jamais stocké ni affiché en clair. La comparaison se fait à temps constant.
- **Temporisation** : après 3 échecs, blocage 30 s ; après 5, 5 min ; après 8, 15 min. Le compteur et la date de fin
  sont **persistés** dans IndexedDB : un rechargement de page ne réinitialise pas le blocage.
- **Mode enfant** (réglage) : l'accès parents par l'icône exige un appui long de 2 secondes.
- **Code oublié** : réinitialisation complète après double confirmation. Cette action efface toutes les données.
- Le pavé numérique est composé de boutons ; il n'y a pas de champ `<input>` pour le PIN.

## Sauvegarde

- **Export** : fichier JSON `leanna-jukebox-AAAA-MM-JJ.json` (chansons, playlists, catégories, format `leanna-jukebox-backup` v1).
  Le PIN et les réglages **ne sont jamais exportés**.
- **Import** : le fichier est validé entièrement (format, version, liens, identifiants en double, illustrations,
  références de catégories) avant toute écriture. Une seule transaction remplace les données. Les références vers
  des chansons absentes sont retirées. Taille maximale : 5 Mo, 2 000 éléments par liste.
- **Suppression** : efface chansons, playlists, catégories et PIN, puis réinitialise les données de démonstration.

## Responsive

Vérifié dans le navigateur intégré (`scrollWidth` ≤ `innerWidth`, pas de débordement horizontal) :
390×844, 800×1280, 1024×768, 1280×800, 1920×1080. Les grilles utilisent `auto-fill` avec `minmax`, les marges
tiennent compte des safe areas (`env(safe-area-inset-*)`), `viewport-fit=cover` est activé. Les tests statiques
(`src/app/responsive.test.ts`) protègent ces réglages.

## Tests

`npm run test` exécute les tests répartis sur 9 fichiers :

| Domaine | Fichier |
|---|---|
| Validation des URL YouTube (formats acceptés, domaines refusés) | `services/youtube/youtubeUrlParser.test.ts` |
| Messages d'erreur du lecteur | `services/youtube/youtubeErrors.test.ts` |
| Authentification parentale (hash, sel, temporisation) | `security/pinService.test.ts`, `components/parental/PinPad.test.tsx` |
| Ajout, modification, suppression de chansons, favoris, ordre, playlists, catégories, réglages | `storage/repositories.test.ts` |
| Sauvegarde locale, restauration et validation d'import | `storage/backup.test.ts` |
| Sources de lecture (favoris, récentes, catégorie, playlist) | `services/sources.test.ts` |
| Carte chanson et indicateur de lecture | `components/music/SongCard.test.tsx` |
| Responsive (garde-fous statiques) | `app/responsive.test.ts` |

## Android et Capacitor (préparation)

- `vite.config.ts` utilise `base: './'` et `HashRouter` : l'application fonctionne depuis des fichiers locaux.
- `capacitor.config.json` décrit l'identifiant (`fr.leanna.jukebox`) et le dossier `dist`.
  Capacitor n'est pas installé dans cette version. Pour générer l'APK : `npm i @capacitor/core @capacitor/cli
  @capacitor/android`, puis `npx cap add android` et `npx cap sync`, après avoir installé le SDK Android.
- **Verrouillage de l'appareil** : une application web ne peut pas empêcher seule la sortie vers Android.
  Pour un usage enfant, il faut combiner :
  1. **Épinglage d'écran** (Android « screen pinning » ou mode Lock Task via une application de gestion
     d'appareil, par exemple Google Family Link ou une solution MDM) ;
  2. un écran de verrouillage et des gestes de navigation désactivés dans les réglages Android ;
  3. un compte utilisateur Android dédié à l'enfant.
  Le PIN parental protège l'espace parents de l'application, mais pas le système d'exploitation.

## Conformité (points à vérifier avant distribution)

- Les conditions d'utilisation de l'API YouTube et la politique relative aux enfants (COPPA / « Made for Kids »)
  s'appliquent à toute distribution publique : à valider avec le juridique avant publication.
- RGPD et protection des mineurs : l'application ne collecte aucune donnée personnelle de l'enfant. Les données
  restent sur l'appareil. Le lecteur YouTube (domaine `youtube-nocookie.com`) peut toutefois déposer des cookies
  techniques : les parents doivent en être informés et une politique de confidentialité doit être publiée.
- Aucun suivi publicitaire, aucune publicité ajoutée par l'application, aucun compte enfant.

## Limites connues

- Le volume maximal limite le lecteur ; les boutons de volume matériels de la tablette restent actifs.
- Le plein écran exige un geste utilisateur ; il est déclenché par le bouton Lecture si le réglage est activé.
- La durée d'écoute est indicative : un message propose une pause, la lecture n'est pas coupée.
- Les métadonnées oEmbed dépendent de la disponibilité du service YouTube ; le parent peut toujours saisir le titre.
- Il n'y a pas de synchronisation familiale : elle est prévue par l'architecture (dépôts découplés de Dexie),
  mais non implémentée.
- Pas de contrôle de l'horloge : la temporisation du PIN repose sur l'horloge de la tablette.
