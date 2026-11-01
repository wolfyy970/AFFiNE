import {
  DefaultServerService,
  type Server,
  ServerService,
} from '@affine/core/modules/cloud';
import {
  useLiveData,
  useService,
  useServiceOptional,
} from '@toeverything/infra';

/**
 * Whether the current user may create a cloud workspace on the given server
 * (or the scoped/default server).
 *
 * Source of truth: `currentUser.canCreateWorkspace` from the session query,
 * resolved by the same WorkspaceService.canCreateWorkspace used by the
 * createWorkspace mutation guard.
 *
 * Returns:
 * - `true` / `false` when the capability is known
 * - `null` while the session profile is still loading / stale (do not treat as false)
 */
export function useCanCreateCloudWorkspace(server?: Server): boolean | null {
  const defaultServerService = useService(DefaultServerService);
  const scopedServer = useServiceOptional(ServerService)?.server;
  const target = server ?? scopedServer ?? defaultServerService.server;

  const account = useLiveData(target.account$);

  if (!account) {
    // Unauthenticated — cannot create a cloud workspace.
    return false;
  }

  const value = account.info?.canCreateWorkspace;
  if (typeof value === 'boolean') {
    return value;
  }

  // Authenticated but profile not yet carrying the field (loading / stale cache).
  return null;
}
