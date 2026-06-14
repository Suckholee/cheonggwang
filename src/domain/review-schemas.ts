import { z } from "zod";

export const createReviewInputSchema = z.object({
  bookingId: z.string().min(1, "bookingId는 필수입니다"),
  rating: z.number().int().min(1, "평점은 최소 1점입니다").max(5, "평점은 최대 5점입니다"),
  text: z
    .string()
    .trim()
    .min(5, "후기는 최소 5자 이상 작성해 주세요")
    .max(500, "후기는 500자 이하로 작성해 주세요"),
});

export type CreateReviewInput = z.infer<typeof createReviewInputSchema>;
