import {
  getSignInTitle,
  PRODUCT_NAME,
  ServerService,
} from '@affine/core/modules/cloud';
import { useLiveData, useService } from '@toeverything/infra';

/**
 * Sign-in heading driven by server.name (fallback: PRODUCT_NAME).
 */
export function useSignInTitle() {
  const serverService = useService(ServerService);
  const serverName = useLiveData(
    serverService.server.config$.selector(c => c.serverName)
  );
  return getSignInTitle(serverName || PRODUCT_NAME);
}
