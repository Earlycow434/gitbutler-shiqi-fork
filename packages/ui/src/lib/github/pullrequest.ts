import { asyncWritable, type Loadable } from '@square/svelte-store';
import lscache from 'lscache';

import { PullRequest, type GitHubIntegrationContext } from '$lib/github/types';
import { newClient } from '$lib/github/client';
import type { CustomStore } from '$lib/vbranches/types';

// Uses the cached value as the initial state and also in the event of being offline
export function listPullRequestsWithCache(
	ghContextStore: Loadable<GitHubIntegrationContext | undefined>
): CustomStore<PullRequest[] | undefined> {
	const store = asyncWritable(
		ghContextStore,
		async (ctx) => {
			if (!ctx) return [];
			const key = ctx.owner + '/' + ctx.repo;
			const cachedValue = lscache.get(key);
			if (cachedValue) return cachedValue;
			const prs = await listPullRequests(ctx);
			if (prs) {
				lscache.set(key, prs, 1440); // 1 day ttl
			}
			return prs;
		},
		undefined,
		{ trackState: true }
	) as CustomStore<PullRequest[]>;
	return store;
}

async function listPullRequests(ctx: GitHubIntegrationContext): Promise<PullRequest[] | undefined> {
	const octokit = newClient(ctx);
	try {
		const rsp = await octokit.rest.pulls.list({
			owner: ctx.owner,
			repo: ctx.repo
		});
		return rsp.data.map(PullRequest.fromApi);
	} catch (e) {
		console.log(e);
	}
}

export async function getPullRequestByBranch(
	ctx: GitHubIntegrationContext,
	branch: string
): Promise<PullRequest | undefined> {
	const octokit = newClient(ctx);
	try {
		const rsp = await octokit.rest.pulls.list({
			owner: ctx.owner,
			repo: ctx.repo,
			head: ctx.owner + ':' + branch
		});
		// at most one pull request per head / branch
		const pr = rsp.data.find((pr) => pr !== undefined);
		if (pr) {
			return PullRequest.fromApi(pr);
		}
	} catch (e) {
		console.log(e);
	}
}

export async function createPullRequest(
	ctx: GitHubIntegrationContext,
	head: string,
	base: string,
	title: string,
	body: string
): Promise<PullRequest | undefined> {
	const octokit = newClient(ctx);
	try {
		const rsp = await octokit.rest.pulls.create({
			owner: ctx.owner,
			repo: ctx.repo,
			head,
			base,
			title,
			body
		});
		const pr = rsp.data;
		return PullRequest.fromApi(pr);
	} catch (e) {
		console.log(e);
	}
}
