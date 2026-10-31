import {
  DefaultServerService,
  type Server,
  ServerService,
  UserFeatureService,
} from '@affine/core/modules/cloud';
import {
  useLiveData,
  useService,
  useServiceOptional,
} from '@toeverything/infra';

/**
 * Whether the current user may create a cloud workspace on the given server
 * (or the scoped/default server). Driven by server `CreateWorkspace` feature
 * and/or instance admin — same rules as the server-side guard.
 */
export function useCanCreateCloudWorkspace(server?: Server) {
  const defaultServerService = useService(DefaultServerService);
  const scopedServer = useServiceOptional(ServerService)?.server;
  const target = server ?? scopedServer ?? defaultServerService.server;

  const allowNonAdmin = useLiveData(
    target.features$.map(features => !!features?.createworkspace)
  );

  const userFeatureService = useServiceOptional(UserFeatureService);
  const isAdmin =
    useLiveData(userFeatureService?.userFeature.isAdmin$) ?? false;

  return !!(allowNonAdmin || isAdmin);
}
