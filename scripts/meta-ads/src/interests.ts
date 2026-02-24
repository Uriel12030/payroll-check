import { metaGet } from './api.js';
import { interestSearchResultSchema } from './validators.js';
import type { InterestResult } from './validators.js';
import { logSuccess, logWarn } from './utils.js';

/**
 * Search for ad interest targeting IDs.
 * Returns unique interests found across all search terms.
 */
export async function searchInterests(
  terms: string[],
  token: string
): Promise<InterestResult[]> {
  const seen = new Set<string>();
  const results: InterestResult[] = [];

  for (const term of terms) {
    try {
      const raw = await metaGet('search', token, {
        type: 'adinterest',
        q: term,
      });

      const parsed = interestSearchResultSchema.safeParse(raw);
      if (!parsed.success) {
        logWarn(`Interest search for "${term}": unexpected response shape`);
        continue;
      }

      for (const interest of parsed.data.data) {
        if (!seen.has(interest.id)) {
          seen.add(interest.id);
          results.push(interest);
          logSuccess(
            `Interest: "${interest.name}" (${interest.id}) — audience: ${interest.audience_size_lower_bound?.toLocaleString() ?? '?'}–${interest.audience_size_upper_bound?.toLocaleString() ?? '?'}`
          );
        }
      }
    } catch (err) {
      logWarn(
        `Interest search for "${term}" failed: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  if (results.length === 0) {
    logWarn('No interests found. The interest-based ad set will use broad targeting.');
  }

  return results;
}
