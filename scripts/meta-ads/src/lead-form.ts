import { metaPost } from './api.js';
import type { EnvConfig } from './validators.js';

export interface LeadFormConfig {
  pageId: string;
  privacyUrl: string;
  landingUrl: string;
}

/**
 * Build the lead form creation payload.
 */
export function buildLeadFormPayload(config: LeadFormConfig) {
  return {
    name: 'PayrollCheck_LeadForm_HE',
    locale: 'he_IL',
    questions: JSON.stringify([
      { type: 'FULL_NAME' },
      { type: 'EMAIL' },
      { type: 'PHONE' },
      {
        type: 'CUSTOM',
        key: 'payslip_concern',
        label: 'מה מטריד אותך בתלוש השכר?',
        options: [
          { value: 'שעות נוספות', key: 'overtime' },
          { value: 'הפרשות פנסיה', key: 'pension' },
          { value: 'דמי הבראה', key: 'recreation' },
          { value: 'לא בטוח/ה', key: 'not_sure' },
          { value: 'אחר', key: 'other' },
        ],
      },
    ]),
    context_card: JSON.stringify({
      title: 'בדיקת תלוש שכר חינמית',
      content: [
        'השאירו פרטים ונחזור אליכם עם סיכום ממצאים ראשוני מבדיקת תלוש השכר שלכם.',
      ],
      style: 'PARAGRAPH_STYLE',
    }),
    thank_you_page: JSON.stringify({
      title: 'תודה! קיבלנו את הפרטים',
      body: 'נבדוק את הממצאים ונחזור אליך בהקדם.',
      button_text: 'לאתר',
      button_type: 'VIEW_WEBSITE',
      website_url: config.landingUrl,
    }),
    privacy_policy: JSON.stringify({
      url: config.privacyUrl,
    }),
    follow_up_action_url: config.landingUrl,
  };
}

/**
 * Create a Meta Instant Lead Form on the specified page.
 */
export async function createLeadForm(
  config: LeadFormConfig,
  token: string
): Promise<{ id: string }> {
  const payload = buildLeadFormPayload(config);
  return metaPost<{ id: string }>(
    `${config.pageId}/leadgen_forms`,
    token,
    payload as unknown as Record<string, unknown>
  );
}
