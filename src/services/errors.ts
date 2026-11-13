export type AppErrorCode = 'validation' | 'not-found' | 'storage' | 'locked';

/** Erreur applicative : le message est destiné à l'utilisateur (parent), le code permet le traitement. */
export class AppError extends Error {
  readonly code: AppErrorCode;

  constructor(code: AppErrorCode, message: string) {
    super(message);
    this.name = 'AppError';
    this.code = code;
  }
}

/** Convertit n'importe quelle erreur en message lisible, sans détail technique. */
export function toUserMessage(error: unknown): string {
  if (error instanceof AppError) return error.message;
  console.error(error);
  return 'Une erreur est survenue. Réessaie dans un instant.';
}
