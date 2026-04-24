import { softDeleteRetentionMs as sharedMs } from "../../shared/retention";

export { SOFT_DELETE_RETENTION_DAYS, softDeleteRetentionMs } from "../../shared/retention";

/** Tidsgräns: rader där `deletedAt` är äldre än så här länge kan hårdtas bort. */
export function softDeletePurgeBeforeTimestamp(nowMs: number = Date.now()): number {
  return nowMs - sharedMs();
}
