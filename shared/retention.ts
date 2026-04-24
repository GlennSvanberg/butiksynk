/** Standard tid innan borttagna poster rensas hårt från databasen (dagar). */
export const SOFT_DELETE_RETENTION_DAYS = 14

export const softDeleteRetentionMs = (): number =>
  SOFT_DELETE_RETENTION_DAYS * 24 * 60 * 60 * 1000
