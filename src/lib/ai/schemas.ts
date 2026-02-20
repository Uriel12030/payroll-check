import { z } from 'zod'

/**
 * Zod schema for validating structured AI model output.
 */
export const aiAnalysisOutputSchema = z.object({
  case_summary: z.string().describe('Updated case summary in Hebrew'),
  extracted_facts: z.record(
    z.string(),
    z.union([z.string(), z.number(), z.boolean(), z.null()])
  ).describe('Extracted facts from the conversation'),
  risk_flags: z.array(z.string()).describe('Risk flags identified'),
  suggested_subject: z.string().describe('Suggested email subject in Hebrew'),
  suggested_reply_text: z.string().describe('Suggested email reply body in Hebrew (plain text)'),
  suggested_reply_html: z.string().nullable().describe('Optional HTML version of the reply'),
  questions: z.array(z.string()).describe('List of questions to ask the lead'),
})

export type AiAnalysisOutput = z.infer<typeof aiAnalysisOutputSchema>
