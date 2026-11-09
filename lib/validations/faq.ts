import { z } from "zod";

// Shared by app/actions/admin.ts's FAQ actions (server-side re-validation)
// and AdminFaqPanel. Plain text only - /faq renders answers with
// whitespace-pre-line, so line breaks the admin types are preserved.
export const faqItemSchema = z.object({
  question: z
    .string()
    .trim()
    .min(3, "Question must be at least 3 characters.")
    .max(200, "Question must be 200 characters or fewer."),
  answer: z
    .string()
    .trim()
    .min(3, "Answer must be at least 3 characters.")
    .max(2000, "Answer must be 2000 characters or fewer."),
});

export type FaqItemFormValues = z.infer<typeof faqItemSchema>;

export const faqReorderSchema = z
  .array(z.string().uuid())
  .min(1, "Nothing to reorder.")
  .max(500, "Too many FAQ items to reorder at once.");
