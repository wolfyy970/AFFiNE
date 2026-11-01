import { MenuItem } from '@affine/component/ui/menu';
import { useCanCreateCloudWorkspace } from '@affine/core/components/hooks/affine/use-can-create-cloud-workspace';
import { DefaultServerService } from '@affine/core/modules/cloud';
import { ServerFeature } from '@affine/graphql';
import { useI18n } from '@affine/i18n';
import { ImportIcon, PlusIcon } from '@blocksuite/icons/rc';
import { useLiveData, useService } from '@toeverything/infra';

import * as styles from './index.css';

export const AddWorkspace = ({
  onAddWorkspace,
  onNewWorkspace,
}: {
  onAddWorkspace?: () => void;
  onNewWorkspace?: () => void;
}) => {
  const t = useI18n();
  const defaultServerService = useService(DefaultServerService);
  const enableLocalWorkspace = useLiveData(
    defaultServerService.server.config$.selector(
      c =>
        c.features.includes(ServerFeature.LocalWorkspace) ||
        BUILD_CONFIG.isNative
    )
  );
  const canCreateCloudWorkspace = useCanCreateCloudWorkspace();
  // Only show Create once capability is known true (or local create is allowed).
  const canCreateWorkspace =
    enableLocalWorkspace || canCreateCloudWorkspace === true;

  return (
    <>
      {BUILD_CONFIG.isElectron && (
        <MenuItem
          block={true}
          prefixIcon={<ImportIcon />}
          prefixIconClassName={styles.prefixIcon}
          onClick={onAddWorkspace}
          data-testid="add-workspace"
          className={styles.ItemContainer}
        >
          <div className={styles.ItemText}>
            {t['com.affine.workspace.local.import']()}
          </div>
        </MenuItem>
      )}
      {canCreateWorkspace ? (
        <MenuItem
          block={true}
          prefixIcon={<PlusIcon />}
          prefixIconClassName={styles.prefixIcon}
          onClick={onNewWorkspace}
          data-testid="new-workspace"
          className={styles.ItemContainer}
        >
          <div className={styles.ItemText}>
            {enableLocalWorkspace
              ? t['com.affine.workspaceList.addWorkspace.create']()
              : t['com.affine.workspaceList.addWorkspace.create-cloud']()}
          </div>
        </MenuItem>
      ) : null}
    </>
  );
};
