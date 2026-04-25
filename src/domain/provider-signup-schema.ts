import { z } from "zod";
import { QUOTE_CATEGORIES, type QuoteCategory } from "./quote-category";

// ─── Client form schema ──────────────────────────────────
// v1.6 (post-merge): email → username(아이디). 내부적으론 합성 이메일로 변환.
export const providerSignupFormSchema = z
  .object({
    username: z
      .string()
      .trim()
      .toLowerCase()
      .min(4, "아이디는 4자 이상")
      .max(20, "아이디는 20자 이하")
      .regex(
        /^[a-z][a-z0-9_]{3,19}$/,
        "영문 소문자로 시작 · 영문/숫자/_ 만 사용",
      ),
    password: z
      .string()
      .min(8, "비밀번호는 8자 이상")
      .max(64, "비밀번호는 64자 이하"),
    passwordConfirm: z.string(),
    companyName: z.string().min(2, "업체명은 2자 이상").max(40),
    primaryCategory: z.enum(
      QUOTE_CATEGORIES as unknown as [QuoteCategory, ...QuoteCategory[]],
    ),
    contactPhone: z
      .string()
      .regex(
        /^[0-9]{2,4}-?[0-9]{3,4}-?[0-9]{4}$/,
        "전화번호 형식이 올바르지 않습니다",
      ),
    termsAgreed: z.literal(true, {
      errorMap: () => ({ message: "약관 동의가 필요합니다" }),
    }),
    marketingAgreed: z.boolean().optional(),
  })
  .refine((d) => d.password === d.passwordConfirm, {
    message: "비밀번호가 일치하지 않습니다",
    path: ["passwordConfirm"],
  });

export type ProviderSignupFormInput = z.infer<
  typeof providerSignupFormSchema
>;

// ─── Server Action schema ───────────────────────────────
// password 미포함 (client에서 Firebase Auth 처리 후 idToken만 전달)
export const registerProviderInputSchema = z.object({
  idToken: z.string().min(10),
  companyName: z.string().min(2).max(40),
  primaryCategory: z.enum(
    QUOTE_CATEGORIES as unknown as [QuoteCategory, ...QuoteCategory[]],
  ),
  contactPhone: z
    .string()
    .regex(/^[0-9]{2,4}-?[0-9]{3,4}-?[0-9]{4}$/),
  marketingAgreed: z.boolean().optional(),
});

export type RegisterProviderInput = z.infer<
  typeof registerProviderInputSchema
>;
