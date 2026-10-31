import {
  createWorkspaceMutation,
  serverConfigQuery,
  ServerFeature,
} from '@affine/graphql';

import { ConfigFactory, EventBus } from '../../../base';
import { WorkspaceRole } from '../../../models';
import { Mockers } from '../../mocks';
import { setBlob } from '../../utils/blobs';
import { app, e2e } from '../test';

async function setAllowNonAdminWorkspaceCreate(allow: boolean) {
  app.get(ConfigFactory).override({
    flags: { allowNonAdminWorkspaceCreate: allow },
  });
  await app.get(EventBus).emitAsync('config.changed', {
    updates: { flags: { allowNonAdminWorkspaceCreate: allow } },
  });
}

// Restore the shared e2e harness default after each case so later suites
// keep the legacy createWorkspace behavior.
e2e.afterEach.always(async () => {
  await setAllowNonAdminWorkspaceCreate(true);
});

e2e(
  'should expose CreateWorkspace server feature when non-admin create is allowed',
  async t => {
    await setAllowNonAdminWorkspaceCreate(true);

    const { serverConfig } = await app.gql({ query: serverConfigQuery });
    t.true(serverConfig.features.includes(ServerFeature.CreateWorkspace));
  }
);

e2e(
  'should hide CreateWorkspace server feature when non-admin create is denied',
  async t => {
    await setAllowNonAdminWorkspaceCreate(false);

    const { serverConfig } = await app.gql({ query: serverConfigQuery });
    t.false(serverConfig.features.includes(ServerFeature.CreateWorkspace));
  }
);

e2e(
  'admin can create a cloud workspace when non-admin create is denied',
  async t => {
    await setAllowNonAdminWorkspaceCreate(false);

    const admin = await app.create(Mockers.User, {
      feature: 'administrator',
    });
    await app.login(admin);

    const result = await app.gql({ query: createWorkspaceMutation });
    t.is(typeof result.createWorkspace.id, 'string');
  }
);

e2e('non-admin is refused when creating a cloud workspace', async t => {
  await setAllowNonAdminWorkspaceCreate(false);

  const user = await app.create(Mockers.User);
  await app.login(user);

  const res = await app
    .POST('/graphql')
    .send({
      query: createWorkspaceMutation.query,
    })
    .expect(200);

  t.truthy(res.body.errors?.length);
  t.is(res.body.errors[0].extensions?.name, 'ACTION_FORBIDDEN');
  t.falsy(res.body.data?.createWorkspace);
});

e2e(
  'non-admin can create when allowNonAdminWorkspaceCreate is enabled',
  async t => {
    await setAllowNonAdminWorkspaceCreate(true);

    const user = await app.create(Mockers.User);
    await app.login(user);

    const result = await app.gql({ query: createWorkspaceMutation });
    t.is(typeof result.createWorkspace.id, 'string');
  }
);

e2e(
  'invited member can still edit a shared workspace when create is denied',
  async t => {
    await setAllowNonAdminWorkspaceCreate(false);

    const owner = await app.create(Mockers.User, {
      feature: 'administrator',
    });
    const member = await app.create(Mockers.User);
    const workspace = await app.create(Mockers.Workspace, {
      owner: { id: owner.id },
    });
    await app.create(Mockers.WorkspaceUser, {
      workspaceId: workspace.id,
      userId: member.id,
      type: WorkspaceRole.Collaborator,
    });

    // Member must not be able to create a new cloud workspace.
    await app.login(member);
    const createRes = await app
      .POST('/graphql')
      .send({
        query: createWorkspaceMutation.query,
      })
      .expect(200);
    t.is(createRes.body.errors?.[0]?.extensions?.name, 'ACTION_FORBIDDEN');

    // Member can still read the shared workspace and retains edit actions.
    const { workspace: shared } = await app.gql({
      query: {
        id: 'sharedWorkspaceAccess',
        op: 'sharedWorkspaceAccess',
        query: `
          query sharedWorkspaceAccess {
            workspace(id: "${workspace.id}") {
              id
              permissions {
                Workspace_Sync
                Workspace_CreateDoc
                Workspace_Blobs_Write
              }
            }
          }
        `,
      },
    });
    t.is(shared.id, workspace.id);
    t.true(shared.permissions.Workspace_Sync);
    t.true(shared.permissions.Workspace_CreateDoc);
    t.true(shared.permissions.Workspace_Blobs_Write);

    // Exercise a write path invited members keep (blob upload / sync storage).
    const hash = await setBlob(
      app,
      workspace.id,
      Buffer.from('member-still-can-edit')
    );
    t.is(typeof hash, 'string');
  }
);
