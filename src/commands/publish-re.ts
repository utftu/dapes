import {
  createTimeMessage,
  gitCommitAndPush,
  gitDeleteTag,
  gitPushRemotes,
  gitTag,
} from "../git.ts";
import { publishToNpm, runBuildIfExists } from "../npm.ts";
import { readPackageInfo } from "../version.ts";
import type { ExecCtx } from "../types.ts";

export const publishPackageRetry = async ({
  pathToPackage = "package.json",
  ctx,
}: {
  pathToPackage?: string;
  ctx?: ExecCtx;
} = {}) => {
  const { version } = await readPackageInfo({ pathToPackage });
  const tag = `v${version}`;

  await gitCommitAndPush({ message: createTimeMessage(), all: true, ctx }).catch(() => {});

  await runBuildIfExists({ pathToPackage, ctx });

  await gitDeleteTag({ tag, ctx });
  await gitTag({ tag, ctx });
  await gitPushRemotes({ tag, ctx });

  await publishToNpm({ pathToPackage, ctx });

  return tag;
};
