# Supabase — migrations

## Schéma de synchronisation familiale

Appliquer les migrations versionnées dans l’ordre chronologique :

1. `migrations/20261114000000_init_jukebox.sql` — crée les tables de base (`categories`, `songs`, `playlists`, `playlist_songs`, `settings`) et leurs politiques RLS.
2. `migrations/202611150001_family_realtime_sync.sql` — complète le schéma pour la synchronisation familiale, renforce les politiques RLS et active Realtime sur les tables concernées.

Utiliser le SQL Editor Supabase ou la CLI Supabase configurée sur le bon projet. Sur un projet neuf, appliquer les deux migrations une seule fois et dans cet ordre.

## À propos de `init_jukebox.sql`

Le script initial existe dans ce dépôt sous son nom de migration horodaté : `migrations/20261114000000_init_jukebox.sql`. Il n’existe pas de script distinct à la racine du dépôt nommé simplement `init_jukebox.sql`.

Pour un projet Supabase déjà existant, inspecter les migrations déjà appliquées, les tables, colonnes, contraintes, politiques RLS et publications avant toute intervention. Ne pas rejouer un ancien script externe, supprimer les tables ou réinitialiser les données sans sauvegarde et revue du schéma.

## Sécurité

- Activer l'authentification e-mail/mot de passe selon le parcours parent souhaité.
- Les tables sont protégées par RLS et les politiques limitent chaque compte à ses propres lignes.
- Utiliser uniquement la clé publique anon dans l'application cliente.
- Ne jamais exposer la clé `service_role` au navigateur.
- Le PIN parental demeure local à l'appareil.
