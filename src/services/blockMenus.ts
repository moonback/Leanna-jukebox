/**
 * Dans toute l'application, seul le simple appui compte : pas de clic droit, pas de menu
 * d'appui long, pas de glisser d'image ou de lien, pas de sélection de texte.
 * Exception : les champs de saisie (espace parents), pour pouvoir coller un lien YouTube.
 */
function isEditable(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return target.closest('input, textarea, select, [contenteditable=""], [contenteditable="true"]') !== null;
}

function block(event: Event): void {
  if (!isEditable(event.target)) event.preventDefault();
}

export function installMenuBlocking(doc: Document = document): () => void {
  const events = ['contextmenu', 'dragstart', 'selectstart'] as const;
  events.forEach((name) => doc.addEventListener(name, block));
  return () => events.forEach((name) => doc.removeEventListener(name, block));
}
