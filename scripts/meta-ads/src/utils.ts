import chalk from 'chalk';

export function log(msg: string) {
  console.log(msg);
}

export function logStep(step: number, total: number, msg: string) {
  console.log(chalk.cyan(`[${step}/${total}]`) + ` ${msg}`);
}

export function logSuccess(msg: string) {
  console.log(chalk.green('  ✓ ') + msg);
}

export function logWarn(msg: string) {
  console.log(chalk.yellow('  ⚠ ') + msg);
}

export function logError(msg: string) {
  console.log(chalk.red('  ✗ ') + msg);
}

export function logDry(label: string, payload: unknown) {
  console.log(chalk.magenta(`  [DRY-RUN] ${label}:`));
  console.log(chalk.gray(JSON.stringify(payload, null, 2)));
}

/**
 * Build a landing URL with UTM parameters.
 * Meta dynamic macros ({{campaign.name}}) are resolved by Meta at serve-time.
 */
export function buildUtmUrl(
  base: string,
  params: {
    campaignName: string;
    adsetName: string;
    adName: string;
  }
): string {
  const url = new URL(base);
  url.searchParams.set('utm_source', 'meta');
  url.searchParams.set('utm_medium', 'paid');
  url.searchParams.set('utm_campaign', params.campaignName);
  url.searchParams.set('utm_content', params.adName);
  url.searchParams.set('utm_term', params.adsetName);
  return url.toString();
}

export function adsManagerUrl(accountId: string, objectId: string): string {
  const cleanId = accountId.replace('act_', '');
  return `https://www.facebook.com/adsmanager/manage/campaigns?act=${cleanId}&selected_campaign_ids=${objectId}`;
}
