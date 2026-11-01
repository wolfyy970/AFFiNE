import { Button } from '@affine/component/ui/button';
import { useCanCreateCloudWorkspace } from '@affine/core/components/hooks/affine/use-can-create-cloud-workspace';
import { DefaultServerService } from '@affine/core/modules/cloud';
import { DesktopApiService } from '@affine/core/modules/desktop-api';
import { GlobalDialogService } from '@affine/core/modules/dialogs';
import { WorkspacesService } from '@affine/core/modules/workspace';
import {
  buildShowcaseWorkspace,
  createFirstAppData,
} from '@affine/core/utils/first-app-data';
import { ServerFeature } from '@affine/graphql';
import {
  useLiveData,
  useService,
  useServiceOptional,
} from '@toeverything/infra';
import {
  type ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { useSearchParams } from 'react-router-dom';

import {
  RouteLogic,
  useNavigateHelper,
} from '../../../components/hooks/use-navigate-helper';
import { WorkspaceNavigator } from '../../../components/workspace-selector';
import { AuthService } from '../../../modules/cloud';
import { AppContainer } from '../../components/app-container';

/**
 * index page
 *
 * query string:
 * - initCloud: boolean, if true, when user is logged in, create a cloud workspace
 */
export const Component = ({
  defaultIndexRoute = 'all',
  children,
  fallback,
  createErrorFallback,
}: {
  defaultIndexRoute?: string;
  children?: ReactNode;
  fallback?: ReactNode;
  createErrorFallback?: (retry: () => void) => ReactNode;
}) => {
  // navigating and creating may be slow, to avoid flickering, we show workspace fallback
  const [navigating, setNavigating] = useState(true);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState(false);
  const [createAttempt, setCreateAttempt] = useState(0);
  const authService = useService(AuthService);
  const defaultServerService = useService(DefaultServerService);
  const globalDialogService = useService(GlobalDialogService);

  const loggedIn = useLiveData(
    authService.session.status$.map(s => s === 'authenticated')
  );
  const enableLocalWorkspace =
    useLiveData(
      defaultServerService.server.config$.selector(
        c =>
          c.features.includes(ServerFeature.LocalWorkspace) ||
          BUILD_CONFIG.isNative
      )
    ) ?? true;
  const canCreateCloudWorkspace = useCanCreateCloudWorkspace();

  const workspacesService = useService(WorkspacesService);
  const list = useLiveData(workspacesService.list.workspaces$);
  const listIsLoading = useLiveData(workspacesService.list.isRevalidating$);

  const { openPage, jumpToPage, jumpToSignIn } = useNavigateHelper();
  const [searchParams] = useSearchParams();

  const createOnceRef = useRef(false);

  const createCloudWorkspace = useCallback(() => {
    if (createOnceRef.current) return;
    if (canCreateCloudWorkspace !== true) return;
    createOnceRef.current = true;
    // TODO: support selfhosted
    buildShowcaseWorkspace(workspacesService, 'affine-cloud', 'AFFiNE Cloud')
      .then(({ meta, defaultDocId }) => {
        if (defaultDocId) {
          jumpToPage(meta.id, defaultDocId);
        } else {
          openPage(meta.id, defaultIndexRoute);
        }
      })
      .catch(err => console.error('Failed to create cloud workspace', err));
  }, [
    canCreateCloudWorkspace,
    defaultIndexRoute,
    jumpToPage,
    openPage,
    workspacesService,
  ]);

  const openCreateWorkspace = useCallback(() => {
    if (canCreateCloudWorkspace !== true) return;
    globalDialogService.open('create-workspace', {}, payload => {
      if (!payload) return;
      if (payload.defaultDocId) {
        jumpToPage(payload.metadata.id, payload.defaultDocId);
      } else {
        openPage(payload.metadata.id, defaultIndexRoute);
      }
    });
  }, [
    canCreateCloudWorkspace,
    defaultIndexRoute,
    globalDialogService,
    jumpToPage,
    openPage,
  ]);

  useLayoutEffect(() => {
    if (!navigating) {
      return;
    }

    if (listIsLoading) {
      return;
    }

    // Wait until create capability is known so an admin never lands on a
    // dead-end empty state while the session profile is still loading.
    if (loggedIn && list.length === 0 && canCreateCloudWorkspace === null) {
      return;
    }

    if (!enableLocalWorkspace && !loggedIn) {
      localStorage.removeItem('last_workspace_id');
      jumpToSignIn();
      return;
    }

    // check is user logged in && has cloud workspace
    if (searchParams.get('initCloud') === 'true') {
      if (loggedIn) {
        if (list.every(w => w.flavour !== 'affine-cloud')) {
          createCloudWorkspace();
          return;
        }

        // open first cloud workspace
        const openWorkspace =
          list.find(w => w.flavour === 'affine-cloud') ?? list[0];
        openPage(openWorkspace.id, defaultIndexRoute);
      } else {
        return;
      }
    } else {
      if (list.length === 0) {
        if (BUILD_CONFIG.isMobileEdition && enableLocalWorkspace) {
          return;
        }
        setNavigating(false);
        return;
      }
      // open last workspace
      const lastId = localStorage.getItem('last_workspace_id');

      const openWorkspace = list.find(w => w.id === lastId) ?? list[0];
      openPage(openWorkspace.id, defaultIndexRoute, RouteLogic.REPLACE);
    }
  }, [
    canCreateCloudWorkspace,
    enableLocalWorkspace,
    createCloudWorkspace,
    list,
    openPage,
    searchParams,
    jumpToSignIn,
    listIsLoading,
    loggedIn,
    navigating,
    defaultIndexRoute,
  ]);

  const desktopApi = useServiceOptional(DesktopApiService);

  useEffect(() => {
    desktopApi?.handler.ui.pingAppLayoutReady().catch(console.error);
  }, [desktopApi]);

  useEffect(() => {
    if (listIsLoading || list.length > 0 || !enableLocalWorkspace) {
      return;
    }

    const creation = createFirstAppData(workspacesService);
    if (!creation) return;

    setCreateError(false);
    setCreating(true);
    creation
      .then(createdWorkspace => {
        if (createdWorkspace) {
          if (createdWorkspace.defaultPageId) {
            jumpToPage(
              createdWorkspace.meta.id,
              createdWorkspace.defaultPageId
            );
          } else {
            openPage(createdWorkspace.meta.id, 'all');
          }
        }
      })
      .catch(err => {
        console.error('Failed to create first app data', err);
        setCreateError(true);
      })
      .finally(() => {
        setCreating(false);
      });
  }, [
    jumpToPage,
    openPage,
    workspacesService,
    listIsLoading,
    list,
    enableLocalWorkspace,
    createAttempt,
  ]);

  const retryCreate = useCallback(() => {
    setCreateAttempt(attempt => attempt + 1);
  }, []);

  if (createError && createErrorFallback) {
    return createErrorFallback(retryCreate);
  }

  if (navigating || creating) {
    return fallback ?? <AppContainer fallback />;
  }

  // Zero workspaces: admin (or anyone allowed) gets Create; others get invite hint.
  if (list.length === 0 && loggedIn && !enableLocalWorkspace) {
    if (canCreateCloudWorkspace === true) {
      return (
        children ?? (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 16,
              padding: 24,
              textAlign: 'center',
            }}
          >
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 600 }}>
              Create your first workspace
            </h1>
            <p style={{ margin: 0, maxWidth: 360, opacity: 0.75 }}>
              You don&apos;t have any workspaces yet. Create one to get started.
            </p>
            <Button
              variant="primary"
              size="large"
              data-testid="empty-create-workspace"
              onClick={openCreateWorkspace}
            >
              Create workspace
            </Button>
            <div style={{ marginTop: 8 }}>
              <WorkspaceNavigator
                open={true}
                menuContentOptions={{
                  forceMount: true,
                }}
              />
            </div>
          </div>
        )
      );
    }

    if (canCreateCloudWorkspace === false) {
      return (
        children ?? (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 12,
              padding: 24,
              textAlign: 'center',
            }}
            data-testid="empty-no-workspace-access"
          >
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 600 }}>
              No workspaces yet
            </h1>
            <p style={{ margin: 0, maxWidth: 400, opacity: 0.75 }}>
              You don&apos;t have access to any workspaces yet. Ask the admin to
              invite you.
            </p>
            <div style={{ marginTop: 8 }}>
              <WorkspaceNavigator
                open={true}
                menuContentOptions={{
                  forceMount: true,
                }}
              />
            </div>
          </div>
        )
      );
    }
  }

  return (
    children ?? (
      <div
        style={{
          position: 'fixed',
          left: 'calc(50% - 150px)',
          top: '50%',
        }}
      >
        <WorkspaceNavigator
          open={true}
          menuContentOptions={{
            forceMount: true,
          }}
        />
      </div>
    )
  );
};
