import { dirname } from "node:path";
import { gitAdd, gitCommit, gitDeleteTag, gitPushRemotes, gitTag } from "../git.ts";
import { readPackageInfo, updatePackageVersion, type VersionBump } from "../version.ts";
import type { ExecCtx } from "../types.ts";

export const releasePackageMono = async ({
  pathToPackage = "package.json",
  version = "patch",
  ctx,
}: {
  pathToPackage: string;
  version?: VersionBump;
  ctx?: ExecCtx;
}) => {
  const packageDir = dirname(pathToPackage);

  const { name, version: newVersion } = await updatePackageVersion({
    pathToPackage,
    version,
    ctx,
  });

  const tag = `${name}@v${newVersion}`;

  await gitAdd({ path: packageDir, ctx });
  await gitCommit({ message: tag, ctx });
  await gitTag({ tag, ctx });
  await gitPushRemotes({ tag, ctx });

  return tag;
};

export const releasePackageMonoRetry = async ({
  pathToPackage,
  ctx,
}: {
  pathToPackage: string;
  ctx?: ExecCtx;
}) => {
  const { name, version } = await readPackageInfo({ pathToPackage });
  const tag = `${name}@v${version}`;

  await gitDeleteTag({ tag, ctx });
  await gitTag({ tag, ctx });
  await gitPushRemotes({ tag, ctx });

  return tag;
};
