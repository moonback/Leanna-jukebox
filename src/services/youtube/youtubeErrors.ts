export interface PlayerErrorMessage {
  /** Message simple, lisible par un enfant, sans texte technique. */
  childMessage: string;
  /** Explication pour les parents. */
  parentHint: string;
  /** Vrai si relancer la lecture plus tard peut réussir (réseau). */
  retryable: boolean;
}

/** Codes officiels de l'IFrame Player API : https://developers.google.com/youtube/iframe_api_reference#onError */
export function describePlayerError(code: number | null, offline = false): PlayerErrorMessage {
  if (offline) {
    return {
      childMessage: 'Oups, pas de réseau. Reviens quand la connexion revient !',
      parentHint: 'Absence de réseau : vérifiez la connexion Wi-Fi de la tablette.',
      retryable: true,
    };
  }
  switch (code) {
    case 2:
      return {
        childMessage: 'Cette chanson ne peut pas être lue. Essaie une autre chanson !',
        parentHint: 'Paramètre de lecture invalide : identifiant vidéo incorrect.',
        retryable: false,
      };
    case 5:
      return {
        childMessage: 'Le lecteur n’arrive pas à jouer cette chanson.',
        parentHint: 'Erreur du lecteur HTML5 : essayez plus tard ou vérifiez le navigateur.',
        retryable: true,
      };
    case 100:
      return {
        childMessage: 'Cette chanson n’est plus disponible.',
        parentHint: 'Vidéo supprimée ou privée : retirez-la ou remplacez le lien.',
        retryable: false,
      };
    case 101:
    case 150:
    case 153:
      return {
        childMessage: 'Cette chanson ne peut pas être jouée ici. Essaie une autre chanson !',
        parentHint:
          'Le propriétaire de la vidéo interdit la lecture dans un lecteur intégré. Choisissez une autre vidéo.',
        retryable: false,
      };
    default:
      return {
        childMessage: 'Oups, la chanson ne démarre pas. Essaie encore !',
        parentHint: `Erreur inconnue du lecteur${code === null ? '' : ` (code ${code})`}.`,
        retryable: true,
      };
  }
}
