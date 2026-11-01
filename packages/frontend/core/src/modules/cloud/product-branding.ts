/**
 * Fork product display name for BetaBeta self-host.
 * Keep in sync with the server `server.name` default / config.
 */
export const PRODUCT_NAME = 'BetaBetaProjects';

/** Understated credit shown on the web sign-in chrome. */
export const AFFINE_SELF_HOSTED_CREDIT = 'AFFiNE self-hosted';

export function getSignInTitle(serverName?: string | null) {
  const name = serverName?.trim() || PRODUCT_NAME;
  return `Sign in to ${name}`;
}
