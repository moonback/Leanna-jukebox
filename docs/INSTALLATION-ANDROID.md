# Installation de Leanna Jukebox sur Android

## Option 1 — Installer la PWA (sans Android Studio)

La version web est installable depuis un navigateur compatible et son interface est mise en cache pour les démarrages hors ligne.

1. Déployer le site sur une adresse HTTPS.
2. Ouvrir l'adresse dans Chrome sur la tablette Android.
3. Attendre le premier chargement complet avec Internet afin que le service worker mette en cache l'application.
4. Utiliser **Installer Leanna** si le bouton apparaît, ou le menu Chrome **⋮ → Installer l'application** / **Ajouter à l'écran d'accueil**.
5. Ouvrir l'icône installée au moins une fois en ligne, puis tester le démarrage en mode avion.

Le service worker conserve l'application, ses ressources statiques chargées et un nombre limité de miniatures YouTube déjà consultées. Les données métier restent dans IndexedDB/Dexie. La synchronisation familiale se met en pause hors ligne et reprend au retour du réseau.

**Limite importante :** les vidéos YouTube sont diffusées par YouTube et ne sont pas téléchargées ni mises en cache. La lecture d'une chanson nécessite donc une connexion Internet. Le mode hors ligne couvre l'interface, la bibliothèque locale, l'imagier, les jeux, les autocollants et les données déjà enregistrées ; il ne garantit pas la lecture vidéo.

## Option 2 — Générer un APK avec Capacitor

Le dépôt contient déjà `capacitor.config.json`, mais les dépendances Capacitor et le projet Android natif ne sont pas encore ajoutés. Sur une machine avec Node.js 22+, Android Studio et le SDK Android :

```bash
npm install @capacitor/core @capacitor/android
npm install -D @capacitor/cli
npx cap init "Leanna Jukebox" "fr.leanna.jukebox" --web-dir dist
npm run build
npx cap add android
npx cap sync android
npx cap open android
```

Dans Android Studio : sélectionner la variante **debug**, puis **Build → Build Bundle(s) / APK(s) → Build APK(s)**. Le fichier debug est généré sous `android/app/build/outputs/apk/debug/`.

Après toute modification du frontend, relancer `npm run build` puis `npx cap sync android`.

## Vérifications obligatoires sur la tablette

- Installer l'APK ou la PWA et lancer l'application en mode avion après une première ouverture en ligne.
- Vérifier la rotation, les zones de sécurité de l'écran, la reprise après mise en veille et la persistance IndexedDB.
- Vérifier les sons après une interaction utilisateur (Android peut suspendre l'AudioContext).
- Vérifier la lecture YouTube en ligne et son message/état hors ligne.
- Tester le bouton Retour Android : depuis une activité, revenir à l'accueil enfant ; depuis l'accueil, ne pas quitter l'application accidentellement.
- Tester l'épinglage d'écran Android ou le mode Lock Task pour l'usage par un jeune enfant.

Le build APK et ces essais matériels doivent être réalisés sur une machine équipée d'Android Studio/SDK et sur la tablette cible ; ils ne peuvent pas être certifiés depuis le dépôt seul.
