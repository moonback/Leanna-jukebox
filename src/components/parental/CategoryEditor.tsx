import { useState } from 'react';
import { ArrowRight, Pencil, Plus, Trash2 } from 'lucide-react';
import { useMusicLibrary } from '../../hooks/useMusicLibrary';
import { Illustration } from '../../illustrations/Illustration';
import { Button } from '../ui/Button';
import { IllustrationPicker } from '../ui/IllustrationPicker';
import { addCategory, deleteCategory, updateCategory } from '../../storage/categoryRepository';
import { db } from '../../storage/database';
import { toUserMessage } from '../../services/errors';
import type { IllustrationKey } from '../../illustrations/illustrationKeys';

/** Catégories : les parents peuvent en ajouter, les renommer et les supprimer. */
export function CategoryEditor() {
  const { categories, songs } = useMusicLibrary();
  const [title, setTitle] = useState('');
  const [illustration, setIllustration] = useState<IllustrationKey>('bunny');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editIllustration, setEditIllustration] = useState<IllustrationKey>('bunny');
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async (action: () => Promise<unknown>) => {
    setError(null);
    try {
      await action();
      return true;
    } catch (err) {
      setError(toUserMessage(err));
      return false;
    }
  };

  return (
    <section className="parent-layout parent-layout--split" aria-label="Gestion des catégories">
      <form
        className="card stack"
        onSubmit={(e) => {
          e.preventDefault();
          run(() => addCategory({ title, illustration }, db)).then((ok) => ok && setTitle(''));
        }}
      >
        <h2 style={{ margin: 0 }}>Nouvelle catégorie</h2>
        <label className="field">
          Nom
          <input value={title} maxLength={60} onChange={(e) => setTitle(e.target.value)} placeholder="Ex. : Chansons du matin" />
        </label>
        <IllustrationPicker value={illustration} onChange={setIllustration} />
        <Button type="submit" variant="primary" icon={<Plus size={20} />} disabled={title.trim() === ''}>
          Ajouter la catégorie
        </Button>
      </form>

      <div className="stack">
        {error && <p className="error-text" role="alert">{error}</p>}
        {categories.map((category) => {
          const count = songs.filter((s) => s.categoryId === category.id).length;
          const editing = editingId === category.id;
          return (
            <div key={category.id} className="item-row" style={{ flexWrap: 'wrap' }}>
              {editing ? (
                <div className="stack" style={{ flex: 1, minWidth: 0 }}>
                  <input value={editTitle} maxLength={60} onChange={(e) => setEditTitle(e.target.value)} aria-label="Nouveau nom" />
                  <IllustrationPicker value={editIllustration} onChange={setEditIllustration} />
                  <div className="row-wrap">
                    <Button
                      variant="primary"
                      onClick={() =>
                        run(() => updateCategory(category.id, { title: editTitle, illustration: editIllustration }, db)).then(
                          (ok) => ok && setEditingId(null),
                        )
                      }
                    >
                      Enregistrer
                    </Button>
                    <Button onClick={() => setEditingId(null)}>Annuler</Button>
                  </div>
                </div>
              ) : (
                <>
                  <Illustration name={category.illustration} style={{ width: 44, height: 44 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="item-row__title">{category.title}</div>
                    <div className="muted" style={{ fontSize: '0.85rem' }}>{count} chanson(s)</div>
                  </div>
                  <Button
                    size="icon"
                    label="Modifier la catégorie"
                    onClick={() => {
                      setEditingId(category.id);
                      setEditTitle(category.title);
                      setEditIllustration(category.illustration);
                    }}
                    icon={<Pencil size={20} />}
                  />
                  {confirmId === category.id ? (
                    <div className="row-wrap" style={{ gap: 6 }}>
                      <span className="muted" style={{ fontSize: '0.85rem' }}>
                        <ArrowRight size={14} aria-hidden="true" /> Les chansons seront déplacées.
                      </span>
                      <Button variant="danger" onClick={() => run(() => deleteCategory(category.id, db)).then((ok) => ok && setConfirmId(null))}>
                        Supprimer
                      </Button>
                      <Button onClick={() => setConfirmId(null)}>Non</Button>
                    </div>
                  ) : (
                    <Button size="icon" variant="danger" label="Supprimer la catégorie" disabled={categories.length <= 1} onClick={() => setConfirmId(category.id)} icon={<Trash2 size={20} />} />
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
