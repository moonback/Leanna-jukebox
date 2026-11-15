# Supabase — migrations

## Schéma de synchronisation familiale

Le schéma de référence actuel est :

`migrations/202611150001_family_realtime_sync.sql`

Appliquer ce fichier une fois dans le SQL Editor du projet Supabase (ou via la CLI Supabase après configuration du projet). Il crée les tables de bibliothèque, les politiques RLS et leur publication Realtime.

## Ancien script init_jukebox.sql

Aucun fichier `init_jukebox.sql` n'est présent dans cette version du dépôt. La migration versionnée ci-dessus est la source de vérité à utiliser pour une nouvelle installation. Ne pas chercher à exécuter un script homonyme externe ou historique en plus de cette migration.

Pour un projet Supabase déjà existant, inspecter les tables, contraintes, politiques et publications avant d'appliquer la migration. Ne pas supprimer les données existantes et ne pas exécuter de scripts de réinitialisation sans sauvegarde et revue du schéma.

## Sécurité

- Activer l'authentification e-mail/mot de passe selon le parcours parent souhaité.
- Les tables sont protégées par RLS et les politiques limitent chaque compte à ses propres lignes.
- Utiliser uniquement la clé publique anon dans l'application cliente.
- Ne jamais exposer la clé `service_role` au navigateur.
- Le PIN parental demeure local à l'appareil.
