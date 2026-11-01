import { Parent, ResolveField, Resolver } from '@nestjs/graphql';

import { UserType } from '../../user/types';
import { WorkspaceService } from '../service';

/**
 * Exposes workspace-creation capability on the current user so the UI
 * and createWorkspace guard share one source of truth.
 */
@Resolver(() => UserType)
export class UserWorkspaceCapabilityResolver {
  constructor(private readonly workspaceService: WorkspaceService) {}

  @ResolveField(() => Boolean, {
    name: 'canCreateWorkspace',
    description:
      'Whether this user may create a cloud workspace. Same rules as the createWorkspace mutation guard.',
  })
  async canCreateWorkspace(@Parent() user: UserType): Promise<boolean> {
    return this.workspaceService.canCreateWorkspace(user.id);
  }
}
