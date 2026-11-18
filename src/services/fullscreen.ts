/**
 * Plein écran pour toute l'app, pas seulement le mode simple.
 * Le navigateur impose un geste utilisateur : on tente au démarrage,
 * puis à chaque appui tant que le plein écran n'est pas actif.
 */
export function installFullscreen(): void {
  const enterFullscreen = () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen?.().catch(() => {});
  };

  enterFullscreen();

  if (document.fullscreenElement) return;

  const onFirstTouch = () => {
    enterFullscreen();
    if (document.fullscreenElement) document.removeEventListener('pointerdown', onFirstTouch);
  };
  document.addEventListener('pointerdown', onFirstTouch);

  // Retour automatique en plein écran si on le quitte (geste système, etc.).
  const onFullscreenChange = () => {
    if (!document.fullscreenElement) enterFullscreen();
  };
  document.addEventListener('fullscreenchange', onFullscreenChange);
}
