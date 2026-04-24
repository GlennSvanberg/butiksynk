import { z } from "zod";

/** Vision QA on the final square product image (Gemini output). */
export const productImageVerdictSchema = z.discriminatedUnion("verdict", [
  z.object({ verdict: z.literal("approved") }),
  z.object({ verdict: z.literal("rotate_cw_90") }),
  z.object({ verdict: z.literal("rotate_ccw_90") }),
  z.object({ verdict: z.literal("rotate_180") }),
  z.object({
    verdict: z.literal("reject"),
    /** English instructions for the next Gemini attempt. */
    regenerationHint: z.string().min(1).max(800),
  }),
]);

export type ProductImageQaVerdict = z.infer<typeof productImageVerdictSchema>;
