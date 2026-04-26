import { z } from "zod";
import { PARTNER_INDUSTRIES } from "./partner-industry";

/**
 * v1.11 partner-rag-system · §5.1 — savePartnerProfile zod schema.
 *
 * H1·R8: photoUrls path validation — Storage URL은 raw 또는 URL-encoded 둘 다 허용.
 */

const photoUrlSchema = z.string().url().refine(
  (u) => {
    try {
      const decoded = decodeURIComponent(u);
      return /\/partners\/[^/]+\/profile\//.test(decoded);
    } catch {
      return false;
    }
  },
  { message: "허용되지 않은 사진 경로 (R8)" },
);

export const partnerProfileFormSchema = z.object({
  description: z.string().trim().min(20).max(2000),
  usps: z.array(z.string().trim().min(1).max(50)).max(10),
  priceItems: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(50),
        price: z.number().int().min(0),
      }),
    )
    .max(30),
  photoUrls: z.array(photoUrlSchema).max(10),
  industry: z.enum(PARTNER_INDUSTRIES),
});

export type PartnerProfileFormInput = z.infer<typeof partnerProfileFormSchema>;

/** admin 강제 편집 (H7). 모든 필드 옵셔널 + status·suspended 추가. */
export const adminEditPartnerProfileSchema = z.object({
  partnerId: z.string().min(1),
  description: z.string().trim().min(0).max(2000).optional(),
  usps: z.array(z.string().trim().min(1).max(50)).max(10).optional(),
  priceItems: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(50),
        price: z.number().int().min(0),
      }),
    )
    .max(30)
    .optional(),
  photoUrls: z.array(photoUrlSchema).max(10).optional(),
  industry: z.enum(PARTNER_INDUSTRIES).optional(),
  status: z
    .enum(["auto-approved", "approved", "pending-review", "rejected"])
    .optional(),
  suspended: z.boolean().optional(),
});

export type AdminEditPartnerProfileInput = z.infer<
  typeof adminEditPartnerProfileSchema
>;

export const reviewPartnerRagSchema = z
  .object({
    partnerId: z.string().min(1),
    decision: z.enum(["approved", "rejected"]),
    reason: z.string().trim().max(500).optional(),
  })
  .refine((v) => v.decision !== "rejected" || !!v.reason, {
    message: "거절 시 사유 필수",
    path: ["reason"],
  });

export type ReviewPartnerRagInput = z.infer<typeof reviewPartnerRagSchema>;

export const reportPartnerRagSchema = z.object({
  partnerId: z.string().min(1),
  reason: z.string().trim().min(10).max(500),
  link: z.string().url().optional(),
});

export type ReportPartnerRagInput = z.infer<typeof reportPartnerRagSchema>;
