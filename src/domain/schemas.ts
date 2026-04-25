import { z } from "zod";
import {
  MAX_ADDRESS,
  MAX_BUSINESS_NAME,
  MAX_KEY_POINT_LENGTH,
  MAX_KEY_POINTS,
  MAX_PHOTOS,
  MIN_KEY_POINTS,
} from "./constants";

export const categorySchema = z.enum(["restaurant", "salon", "cafe"]);

export const photoSchema = z.object({
  url: z.string().url(),
  path: z.string().min(1),
  order: z.number().int().min(0).max(MAX_PHOTOS - 1),
});

export const phoneSchema = z
  .string()
  .regex(/^[0-9]{2,4}-?[0-9]{3,4}-?[0-9]{4}$/u, "전화번호 형식이 올바르지 않습니다");

export const savePageInputSchema = z.object({
  pageId: z.string().optional(),
  category: categorySchema,
  businessName: z
    .string()
    .trim()
    .min(1, "업체명을 입력해주세요")
    .max(MAX_BUSINESS_NAME, `업체명은 ${MAX_BUSINESS_NAME}자 이내`),
  address: z
    .string()
    .trim()
    .min(1, "주소를 입력해주세요")
    .max(MAX_ADDRESS, `주소는 ${MAX_ADDRESS}자 이내`),
  phone: phoneSchema,
  keyPoints: z
    .array(z.string().trim().min(1).max(MAX_KEY_POINT_LENGTH))
    .min(MIN_KEY_POINTS, `키포인트 ${MIN_KEY_POINTS}개 이상`)
    .max(MAX_KEY_POINTS, `키포인트 ${MAX_KEY_POINTS}개 이하`),
  photos: z.array(photoSchema).min(1).max(MAX_PHOTOS),
});
export type SavePageInput = z.infer<typeof savePageInputSchema>;

export const heroSectionSchema = z.object({
  title: z.string().max(30),
  subtitle: z.string().max(60),
});
export const introSectionSchema = z.object({
  body: z.string().max(180),
});
export const highlightsSectionSchema = z.object({
  items: z.array(z.string().max(40)).min(1).max(5),
});
export const hygieneSectionSchema = z.object({
  body: z.string().max(140),
});
export const locationSectionSchema = z.object({
  mapEmbed: z.string().url().or(z.literal("")),
});
export const ctaSectionSchema = z.object({
  label: z.string().max(10),
  link: z.string().min(1),
});

export const sectionsSchema = z.object({
  hero: heroSectionSchema,
  intro: introSectionSchema,
  highlights: highlightsSectionSchema,
  hygiene: hygieneSectionSchema.nullable(),
  location: locationSectionSchema,
  cta: ctaSectionSchema,
});

export const generateRequestSchema = z.object({
  pageId: z.string().min(1),
});
export type GenerateRequest = z.infer<typeof generateRequestSchema>;

export const signInWithEmailInputSchema = z.object({
  idToken: z.string().min(1),
});
