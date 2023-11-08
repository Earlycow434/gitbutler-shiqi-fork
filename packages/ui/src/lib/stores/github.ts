import type { User } from '$lib/backend/cloud';
import type { GitHubIntegrationContext } from '$lib/github/types';
import type { BaseBranch } from '$lib/vbranches/types';
import { asyncWritable, type Loadable, type WritableLoadable } from '@square/svelte-store';

export function getGitHubContextStore(
	userStore: Loadable<User | undefined>,
	baseBranchStore: Loadable<BaseBranch | undefined>
): WritableLoadable<GitHubIntegrationContext | undefined> {
	return asyncWritable([userStore, baseBranchStore], ([user, baseBranch]) => {
		const remoteUrl = baseBranch?.remoteUrl;
		const authToken = user?.github_access_token;
		if (!remoteUrl || !remoteUrl.includes('github') || !authToken) return;

		const [owner, repo] = remoteUrl.split('.git')[0].split(/\/|:/).slice(-2);
		return { authToken, owner, repo };
	});
}
