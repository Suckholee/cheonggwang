import { z } from "zod";
import { PARTNER_INDUSTRIES } from "./partner-industry";

/**
 * v1.11 partner-rag-system · §5.6 — saveContentTemplate zod schema.
 */

export const contentTemplateFormSchema = z.object({
  id: z.string().min(1).optional(), // 신규는 undefined → nanoid
  type: z.enum(["blog", "card-news"]),
  industry: z.enum(PARTNER_INDUSTRIES),
  title: z.string().trim().min(1).max(100),
  body: z.string().trim().min(50).max(10000),
  tags: z.array(z.string().trim().min(1).max(30)).max(10),
  scenarios: z.array(z.string().trim().min(1).max(100)).max(10),
});

export type ContentTemplateFormInput = z.infer<
  typeof contentTemplateFormSchema
>;
