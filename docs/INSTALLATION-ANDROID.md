# Installation Android — Leanna Jukebox

## Prérequis

- Node.js 22 ou supérieur.
- Android Studio 2025.2.1 ou supérieur.
- Android SDK Platform 24 ou supérieur (API 36 recommandé).
- Une tablette Android pour les essais finaux.

Capacitor 8 est utilisé pour l'enveloppe native Android. Le projet web reste React/Vite et continue à fonctionner comme PWA.

## Installer les dépendances

Depuis la racine du dépôt :

```powershell
npm ci
```

Les dépendances Capacitor Core, Android et App sont déjà déclarées dans `package.json` et verrouillées dans `package-lock.json`.

## Générer le projet Android natif

```powershell
npm run android:add
```

Cette commande construit le frontend puis demande à Capacitor de générer le dossier `android/`. Elle n'est à exécuter qu'une fois.

## Synchroniser et ouvrir Android Studio

```powershell
npm run android:sync
npm run android:open
```

Après chaque modification du frontend, exécuter `npm run android:sync` avant de reconstruire l'APK.

## Construire l'APK debug sous Windows

```powershell
npm run android:apk
```

Fichier attendu : `android/app/build/outputs/apk/debug/app-debug.apk`.

Pour installer depuis un appareil connecté avec le débogage USB activé :

```powershell
cd android
.\gradlew.bat installDebug
```

Ou transférer `app-debug.apk` sur la tablette et autoriser temporairement l'installation depuis cette source.

## Bouton Retour Android

Le composant natif `AndroidBackButton` applique le comportement suivant :

- Depuis une activité enfant ou l'espace parents, le bouton Retour ramène à l'accueil enfant.
- Depuis l'accueil enfant, il minimise l'application au lieu de la fermer.
- Dans le navigateur web/PWA, ce composant ne s'active pas.

## Usage enfant et mode kiosque

Le mode kiosque n'est pas activé automatiquement : il dépend du contrôle parental Android et du modèle de tablette. Pour un usage familial, utiliser **Épinglage d'application** dans les paramètres Android. Pour un déploiement administré, configurer Android Enterprise / Lock Task avec un administrateur d'appareil. Tester la sortie du mode épinglé avec le code parental.

## Essais à réaliser sur la tablette

- Démarrer l'application après installation, puis la relancer en mode avion.
- Vérifier que les chansons, catégories, playlists, autocollants et progressions restent présents.
- Vérifier que l'interface, les jeux et l'imagier restent utilisables hors ligne.
- Vérifier que YouTube affiche clairement l'indisponibilité hors ligne : la vidéo reste un flux Internet, elle n'est jamais téléchargée.
- Tester le bouton Retour depuis chaque activité, puis depuis l'accueil.
- Tester rotation, mise en veille/reprise, son, plein écran et zones de sécurité.
- Tester l'épinglage d'écran et le contrôle de sortie par un adulte.

Le dépôt contient les scripts et le comportement applicatif Capacitor. Le dossier `android/` et l'APK doivent être générés sur une machine disposant d'Android Studio et du SDK ; ils ne sont pas produits par une simple modification de fichiers GitHub.
