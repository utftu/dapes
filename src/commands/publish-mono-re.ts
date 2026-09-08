import { gitCommitAndPush, gitDeleteTag, gitPushRemotes, gitTag } from "../git.ts";
import { publishToNpm, runBuildIfExists } from "../npm.ts";
import { readPackageInfo } from "../version.ts";
import type { ExecCtx } from "../types.ts";

export const publishPackageMonoRetry = async ({
  pathToPackage,
  ctx,
}: {
  pathToPackage: string;
  ctx?: ExecCtx;
}) => {
  const { name, version } = await readPackageInfo({ pathToPackage });
  const tag = `${name}@v${version}`;

  await gitCommitAndPush({ message: tag, ctx }).catch(() => {});

  await gitDeleteTag({ tag, ctx });
  await gitTag({ tag, ctx });
  await gitPushRemotes({ tag, ctx });

  await runBuildIfExists({ pathToPackage, ctx });
  await publishToNpm({ pathToPackage, ctx });

  return tag;
};
