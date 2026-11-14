import { Fragment, useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useMusicLibrary } from '../../hooks/useMusicLibrary';
import { Illustration } from '../../illustrations/Illustration';
import { Button } from '../ui/Button';
import { SwipeRow } from '../ui/SwipeRow';
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
            <Fragment key={category.id}>
              {editing ? (
                <div className="item-row">
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
                </div>
              ) : (
                <SwipeRow
                  rightWidth={168}
                  closeSignal={confirmId === category.id ? null : category.id}
                  rightActions={
                    <>
                      <button
                        type="button"
                        className="swipe-action swipe-action--edit"
                        onClick={() => {
                          setEditingId(category.id);
                          setEditTitle(category.title);
                          setEditIllustration(category.illustration);
                        }}
                      >
                        <Pencil size={22} />
                        <span>Modifier</span>
                      </button>
                      <button
                        type="button"
                        className={`swipe-action swipe-action--danger${confirmId === category.id ? ' is-confirm' : ''}`}
                        disabled={categories.length <= 1}
                        onClick={() => {
                          if (confirmId !== category.id) {
                            setConfirmId(category.id);
                            return;
                          }
                          run(() => deleteCategory(category.id, db)).then((ok) => ok && setConfirmId(null));
                        }}
                      >
                        <Trash2 size={22} />
                        <span>{confirmId === category.id ? 'Confirmer ?' : 'Supprimer'}</span>
                      </button>
                    </>
                  }
                >
                  <div className="item-row">
                    <Illustration name={category.illustration} style={{ width: 44, height: 44 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="item-row__title">{category.title}</div>
                      <div className="muted" style={{ fontSize: '0.85rem' }}>
                        {count} chanson(s)
                        {confirmId === category.id && ' · les chansons seront déplacées'}
                      </div>
                    </div>
                  </div>
                </SwipeRow>
              )}
            </Fragment>
          );
        })}
      </div>
    </section>
  );
}
