import { gitAdd, gitCommit, gitPushRemotes, gitTag } from "../git.ts";
import { updatePackageVersion, type VersionBump } from "../version.ts";
import type { ExecCtx } from "../types.ts";

export const releasePackage = async ({
  pathToPackage = "package.json",
  version = "patch",
  ctx,
}: {
  pathToPackage?: string;
  version?: VersionBump;
  ctx?: ExecCtx;
} = {}) => {
  const { version: newVersion } = await updatePackageVersion({
    pathToPackage,
    version,
    ctx,
  });

  const tag = `v${newVersion}`;

  await gitAdd({ ctx });
  await gitCommit({ message: tag, ctx });
  await gitTag({ tag, ctx });
  await gitPushRemotes({ tag, ctx });

  return tag;
};
