import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.daily(
  "purge old soft-deleted products",
  { hourUTC: 2, minuteUTC: 15 },
  internal.products.purgeOldSoftDeleted,
);

export default crons;
