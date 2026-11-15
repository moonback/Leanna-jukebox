# Supabase — migrations et synchronisation familiale

## Ordre des migrations

Appliquer les migrations versionnées dans l’ordre chronologique :

1. `migrations/20261114000000_init_jukebox.sql` — tables initiales et politiques RLS.
2. `migrations/202611150001_family_realtime_sync.sql` — schéma familial historique et publication Realtime.
3. `migrations/202611160001_sync_outbox_lww.sql` — journal canonique `sync_records`, reçus idempotents, fonction `merge_sync_record`, tombstones et reprise des données historiques.

Sur un projet neuf, appliquer les trois migrations une seule fois et dans cet ordre. Pour un projet existant, vérifier l'historique des migrations, les colonnes, contraintes, politiques et publications avant d'intervenir. La troisième migration importe les lignes existantes vers `sync_records` sans supprimer les tables historiques.

## Fonctionnement Phase 2

- Les clients n'écrivent plus directement les tables historiques pour synchroniser les changements ; le journal `sync_records` est la source cloud canonique.
- `sync_operation_receipts` empêche le rejeu d'une même opération UUID après une interruption.
- `merge_sync_record` fusionne les seuls champs fournis dans le patch et leur associe une horloge serveur. La dernière opération reçue par le serveur gagne champ par champ.
- Une suppression est conservée comme tombstone via `deleted_at` ; elle n'est pas inférée par comparaison de listes locales.
- Realtime publie les modifications de `sync_records`. Le client applique l'événement ciblé et fait une réconciliation complète au démarrage/reconnexion.
- Les suppressions dépassant 30 % d'une catégorie d'entités demandent une confirmation parentale dans l'application.
- Les opérations hors ligne restent dans l'outbox IndexedDB jusqu'à leur confirmation par le serveur.

## Sécurité

- Authentification e-mail/mot de passe activée selon le parcours parent souhaité.
- RLS active sur les tables de synchronisation ; chaque compte ne peut lire/écrire que ses propres lignes.
- La fonction `merge_sync_record` vérifie `auth.uid()` et limite les types d'entités acceptés.
- Utiliser uniquement la clé publique anon dans le navigateur.
- Ne jamais exposer la clé `service_role`.
- Le PIN parental, son sel, ses paramètres PBKDF2 et les compteurs d'échec restent locaux à chaque appareil.

## Limites de validation

La migration doit être exécutée sur un projet Supabase de test avant production. Valider les scénarios multi-appareils, notamment les opérations concurrentes, les reprises hors ligne et les changements de compte. La résolution « latest » signifie ici dernière opération acceptée par le serveur, et non comparaison d'horloges locales.
