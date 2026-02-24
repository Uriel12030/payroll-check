import { z } from 'zod';

export const envSchema = z.object({
  META_ACCESS_TOKEN: z.string().min(1, 'META_ACCESS_TOKEN is required'),
  META_AD_ACCOUNT_ID: z
    .string()
    .min(1, 'META_AD_ACCOUNT_ID is required')
    .refine((v) => v.startsWith('act_'), 'META_AD_ACCOUNT_ID must start with "act_"'),
  META_PAGE_ID: z.string().min(1, 'META_PAGE_ID is required'),
  META_INSTAGRAM_ID: z.string().optional().default(''),
  META_PIXEL_ID: z.string().optional().default(''),
  LANDING_URL: z.string().url('LANDING_URL must be a valid URL'),
  THANK_YOU_URL: z.string().url('THANK_YOU_URL must be a valid URL'),
  PRIVACY_URL: z.string().url('PRIVACY_URL must be a valid URL'),
});

export type EnvConfig = z.infer<typeof envSchema>;

export const apiResponseSchema = z.object({
  id: z.string(),
});

export const interestSearchResultSchema = z.object({
  data: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      audience_size_lower_bound: z.number().optional(),
      audience_size_upper_bound: z.number().optional(),
    })
  ),
});

export type InterestResult = z.infer<typeof interestSearchResultSchema>['data'][number];
