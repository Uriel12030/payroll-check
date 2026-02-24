#!/usr/bin/env node

import 'dotenv/config';
import chalk from 'chalk';
import { writeFileSync, mkdirSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

import { envSchema, type EnvConfig } from './validators.js';
import { validateToken, validateAdAccount, validatePage, metaPost } from './api.js';
import { searchInterests } from './interests.js';
import { buildLeadFormPayload, createLeadForm } from './lead-form.js';
import { CAMPAIGN, AD_SETS, type AdSetConfig } from './config.js';
import { PRIMARY_TEXTS, HEADLINES, DESCRIPTIONS, CTA } from './creatives.js';
import {
  logStep,
  logSuccess,
  logWarn,
  logError,
  logDry,
  buildUtmUrl,
  adsManagerUrl,
} from './utils.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TOTAL_STEPS = 11;
const isDryRun = process.argv.includes('--dry-run');

// ─── Helpers ──────────────────────────────────────────────────────────────────

interface LaunchReport {
  dryRun: boolean;
  timestamp: string;
  campaign?: { id: string; name: string };
  adSets: Array<{ id: string; name: string }>;
  creatives: Array<{ id: string; name: string }>;
  ads: Array<{ id: string; name: string; adSetName: string }>;
  leadForm?: { id: string };
  interests: Array<{ id: string; name: string }>;
}

function die(msg: string): never {
  logError(msg);
  process.exit(1);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(chalk.bold.blue('\n=== Payroll-Check Meta Ads Campaign Launcher ===\n'));
  if (isDryRun) {
    console.log(chalk.magenta.bold('  MODE: DRY RUN — no resources will be created\n'));
  }

  // ── 1. Load + validate env ──────────────────────────────────────────────────
  logStep(1, TOTAL_STEPS, 'Validating environment variables...');
  const envResult = envSchema.safeParse(process.env);
  if (!envResult.success) {
    for (const issue of envResult.error.issues) {
      logError(`${issue.path.join('.')}: ${issue.message}`);
    }
    die('Fix the above .env issues and retry.');
  }
  const env: EnvConfig = envResult.data;
  logSuccess('Environment valid');

  // ── 2. Validate token ───────────────────────────────────────────────────────
  logStep(2, TOTAL_STEPS, 'Validating access token...');
  const me = await validateToken(env.META_ACCESS_TOKEN).catch((err: Error) =>
    die(err.message)
  );
  logSuccess(`Token valid — user: ${me.name} (${me.id})`);

  // ── 3. Validate ad account ──────────────────────────────────────────────────
  logStep(3, TOTAL_STEPS, 'Validating ad account access...');
  const account = await validateAdAccount(
    env.META_AD_ACCOUNT_ID,
    env.META_ACCESS_TOKEN
  ).catch((err: Error) =>
    die(
      `No access to ${env.META_AD_ACCOUNT_ID}. Add yourself as Admin in Business Settings → Ad Accounts.\n${err.message}`
    )
  );
  logSuccess(`Ad account: ${account.name} (${account.id}, ${account.currency})`);

  // ── 4. Validate page ───────────────────────────────────────────────────────
  logStep(4, TOTAL_STEPS, 'Validating Facebook page...');
  const page = await validatePage(env.META_PAGE_ID, env.META_ACCESS_TOKEN).catch(
    (err: Error) => die(`Cannot read page ${env.META_PAGE_ID}: ${err.message}`)
  );
  logSuccess(`Page: ${page.name} (${page.id})`);

  // ── 5. Search interests ─────────────────────────────────────────────────────
  logStep(5, TOTAL_STEPS, 'Searching for interest targeting IDs...');
  const interestAdSet = AD_SETS.find((s) => s.interestSearchTerms);
  let allInterests: Array<{ id: string; name: string }> = [];
  if (interestAdSet?.interestSearchTerms) {
    allInterests = await searchInterests(
      interestAdSet.interestSearchTerms,
      env.META_ACCESS_TOKEN
    );
  }

  const report: LaunchReport = {
    dryRun: isDryRun,
    timestamp: new Date().toISOString(),
    adSets: [],
    creatives: [],
    ads: [],
    interests: allInterests.map((i) => ({ id: i.id, name: i.name })),
  };

  // ── 6. Create lead form ─────────────────────────────────────────────────────
  logStep(6, TOTAL_STEPS, 'Creating Instant Lead Form...');
  let leadFormId: string | null = null;
  const leadFormConfig = {
    pageId: env.META_PAGE_ID,
    privacyUrl: env.PRIVACY_URL,
    landingUrl: env.LANDING_URL,
  };

  if (isDryRun) {
    logDry('Lead Form payload', buildLeadFormPayload(leadFormConfig));
  } else {
    try {
      const form = await createLeadForm(leadFormConfig, env.META_ACCESS_TOKEN);
      leadFormId = form.id;
      report.leadForm = { id: leadFormId };
      logSuccess(`Lead form created: ${leadFormId}`);
    } catch (err) {
      logWarn(
        `Lead form creation failed: ${err instanceof Error ? err.message : String(err)}`
      );
      logWarn('Campaign will be created without a linked form — link it manually in Ads Manager.');
    }
  }

  // ── 7. Create campaign ──────────────────────────────────────────────────────
  logStep(7, TOTAL_STEPS, 'Creating campaign...');
  const campaignPayload = {
    name: CAMPAIGN.name,
    objective: CAMPAIGN.objective,
    special_ad_categories: JSON.stringify(CAMPAIGN.specialAdCategories),
    status: CAMPAIGN.status,
    // CBO: Campaign Budget Optimization
    daily_budget: String(CAMPAIGN.dailyBudgetAgorot),
    bid_strategy: 'LOWEST_COST_WITHOUT_CAP',
  };

  let campaignId: string | null = null;
  if (isDryRun) {
    logDry('Campaign payload', campaignPayload);
  } else {
    const result = await metaPost<{ id: string }>(
      `${env.META_AD_ACCOUNT_ID}/campaigns`,
      env.META_ACCESS_TOKEN,
      campaignPayload
    );
    campaignId = result.id;
    report.campaign = { id: campaignId, name: CAMPAIGN.name };
    logSuccess(`Campaign created: ${campaignId}`);
  }

  // ── 8. Create ad sets ───────────────────────────────────────────────────────
  logStep(8, TOTAL_STEPS, 'Creating ad sets...');
  const adSetIds: Array<{ id: string; config: AdSetConfig }> = [];

  for (const adSetConfig of AD_SETS) {
    // Clone targeting to avoid mutating config
    const targeting = JSON.parse(JSON.stringify(adSetConfig.targeting));

    // Inject found interests into the interest-based ad set
    if (adSetConfig.interestSearchTerms && allInterests.length > 0) {
      targeting.flexible_spec = [
        {
          interests: allInterests.map((i) => ({ id: i.id, name: i.name })),
        },
      ];
    } else if (adSetConfig.interestSearchTerms && allInterests.length === 0) {
      // Remove empty flexible_spec — run broad
      delete targeting.flexible_spec;
    }

    const adSetPayload: Record<string, unknown> = {
      name: adSetConfig.name,
      campaign_id: campaignId ?? 'DRY_RUN',
      optimization_goal: 'LEAD_GENERATION',
      billing_event: 'IMPRESSIONS',
      status: CAMPAIGN.status,
      targeting: JSON.stringify(targeting),
      promoted_object: JSON.stringify({
        page_id: env.META_PAGE_ID,
        ...(leadFormId ? { lead_gen_form_id: leadFormId } : {}),
      }),
    };

    if (isDryRun) {
      logDry(`Ad Set: ${adSetConfig.name}`, adSetPayload);
    } else {
      const result = await metaPost<{ id: string }>(
        `${env.META_AD_ACCOUNT_ID}/adsets`,
        env.META_ACCESS_TOKEN,
        adSetPayload
      );
      adSetIds.push({ id: result.id, config: adSetConfig });
      report.adSets.push({ id: result.id, name: adSetConfig.name });
      logSuccess(`Ad set created: ${adSetConfig.name} → ${result.id}`);
    }
  }

  // ── 9. Create creatives ─────────────────────────────────────────────────────
  logStep(9, TOTAL_STEPS, 'Creating ad creatives...');
  const creativeIds: string[] = [];

  for (let i = 0; i < PRIMARY_TEXTS.length; i++) {
    const creativeName = `PC_Creative_${['Short', 'Medium', 'Long'][i]}_HE`;
    const utmUrl = buildUtmUrl(env.LANDING_URL, {
      campaignName: CAMPAIGN.name,
      adsetName: '{{adset.name}}',
      adName: creativeName,
    });

    const creativePayload: Record<string, unknown> = {
      name: creativeName,
      object_story_spec: JSON.stringify({
        page_id: env.META_PAGE_ID,
        ...(env.META_INSTAGRAM_ID
          ? { instagram_actor_id: env.META_INSTAGRAM_ID }
          : {}),
        link_data: {
          message: PRIMARY_TEXTS[i],
          link: utmUrl,
          name: HEADLINES[i % HEADLINES.length],
          description: DESCRIPTIONS[i % DESCRIPTIONS.length],
          call_to_action: {
            type: CTA,
            value: { link: utmUrl },
          },
        },
      }),
    };

    if (isDryRun) {
      logDry(`Creative: ${creativeName}`, creativePayload);
    } else {
      const result = await metaPost<{ id: string }>(
        `${env.META_AD_ACCOUNT_ID}/adcreatives`,
        env.META_ACCESS_TOKEN,
        creativePayload
      );
      creativeIds.push(result.id);
      report.creatives.push({ id: result.id, name: creativeName });
      logSuccess(`Creative created: ${creativeName} → ${result.id}`);
    }
  }

  // ── 10. Create ads (3 creatives × 2 ad sets = 6 ads) ───────────────────────
  logStep(10, TOTAL_STEPS, 'Creating ads...');

  const adSetEntries = isDryRun
    ? AD_SETS.map((config) => ({ id: 'DRY_RUN', config }))
    : adSetIds;

  for (const { id: adSetId, config: adSetConfig } of adSetEntries) {
    for (let i = 0; i < PRIMARY_TEXTS.length; i++) {
      const label = ['Short', 'Medium', 'Long'][i];
      const adName = `PC_${adSetConfig.name}_${label}`;

      const adPayload: Record<string, unknown> = {
        name: adName,
        adset_id: adSetId,
        creative: JSON.stringify({ creative_id: creativeIds[i] ?? 'DRY_RUN' }),
        status: CAMPAIGN.status,
      };

      if (isDryRun) {
        logDry(`Ad: ${adName}`, adPayload);
      } else {
        const result = await metaPost<{ id: string }>(
          `${env.META_AD_ACCOUNT_ID}/ads`,
          env.META_ACCESS_TOKEN,
          adPayload
        );
        report.ads.push({
          id: result.id,
          name: adName,
          adSetName: adSetConfig.name,
        });
        logSuccess(`Ad created: ${adName} → ${result.id}`);
      }
    }
  }

  // ── 11. Summary ─────────────────────────────────────────────────────────────
  logStep(11, TOTAL_STEPS, 'Done!');

  console.log(chalk.bold.green('\n=== Launch Summary ===\n'));

  if (isDryRun) {
    console.log(chalk.magenta('DRY RUN — no resources were created.\n'));
    console.log('Review the payloads above. Remove --dry-run to launch for real.');
  } else {
    console.log(`Campaign: ${report.campaign?.name} (${report.campaign?.id})`);
    console.log(
      `Ads Manager: ${adsManagerUrl(env.META_AD_ACCOUNT_ID, report.campaign?.id ?? '')}`
    );
    console.log(`Ad Sets: ${report.adSets.length}`);
    console.log(`Creatives: ${report.creatives.length}`);
    console.log(`Ads: ${report.ads.length}`);
    if (report.leadForm) {
      console.log(`Lead Form: ${report.leadForm.id}`);
    }
    console.log(`Interests found: ${report.interests.length}`);
    console.log(chalk.yellow('\nCampaign created as PAUSED. Review in Ads Manager before going live.'));
  }

  // Save report
  const outputDir = resolve(__dirname, '..', 'output');
  mkdirSync(outputDir, { recursive: true });
  const reportPath = resolve(outputDir, 'launch-report.json');
  writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(chalk.gray(`\nReport saved to: ${reportPath}`));
  console.log();
}

main().catch((err) => {
  logError(`Unhandled error: ${err instanceof Error ? err.message : String(err)}`);
  if (err instanceof Error && err.stack) {
    console.error(chalk.gray(err.stack));
  }
  process.exit(1);
});
