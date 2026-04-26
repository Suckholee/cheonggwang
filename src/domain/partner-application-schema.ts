import { z } from "zod";
import { QUOTE_CATEGORIES } from "./quote-category";

/**
 * v1.10 partner-application · §5.1 — Form schemas.
 *
 *  v1.10 변경 (cycle #23): 회원가입 후 파트너 등록 흐름으로 단순화.
 *    - 가입 페이지에서 이메일/비밀번호 직접 입력 X (client는 이미 로그인된 상태)
 *    - 폼은 매장 정보만 입력
 *    - server action은 currentUser.getIdToken() 으로 토큰 가져와 호출
 *
 *  Server action input: idToken + 매장 정보 (cycle #21 그대로 호환)
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

/** Client form — 매장 정보만 (인증은 진입 가드에서 보장). */
export const partnerApplicationFormSchema = z.object({
  ...businessSharedSchema,
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
