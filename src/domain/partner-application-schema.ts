import { z } from "zod";
import { QUOTE_CATEGORIES } from "./quote-category";

/**
 * v1.9 partner-application · §5.1 — Form schemas.
 *
 *  - Client form: email + password + business 정보 (password는 client-side Firebase Auth로 처리)
 *  - Server action input: idToken (client에서 createUserWithEmailAndPassword 후 getIdToken) + form data
 */

const businessSharedSchema = {
  businessName: z.string().trim().min(1, "매장명을 입력해 주세요").max(40),
  phone: z
    .string()
    .trim()
    .regex(/^[\d-]{9,13}$/, "연락처 형식이 올바르지 않습니다")
    .optional(),
  category: z
    .enum(QUOTE_CATEGORIES as readonly [string, ...string[]])
    .optional(),
  regionLabel: z.string().trim().max(60).optional(),
  intro: z.string().trim().max(500).optional(),
};

/** Client form (email + password + 매장 정보). */
export const partnerApplicationFormSchema = z
  .object({
    email: z.string().email(),
    password: z.string().min(8).max(64),
    passwordConfirm: z.string(),
    ...businessSharedSchema,
  })
  .refine((d) => d.password === d.passwordConfirm, {
    path: ["passwordConfirm"],
    message: "비밀번호가 일치하지 않습니다",
  });

export type PartnerApplicationFormInput = z.infer<
  typeof partnerApplicationFormSchema
>;

/** Server action input (idToken + 매장 정보). password 미포함. */
export const submitPartnerApplicationInputSchema = z.object({
  idToken: z.string().min(10),
  ...businessSharedSchema,
});

export type SubmitPartnerApplicationInput = z.infer<
  typeof submitPartnerApplicationInputSchema
>;
