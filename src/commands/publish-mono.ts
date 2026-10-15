import { createTimeMessage, gitCommitAndPush, gitTag } from "../git.ts";
import { publishToNpm, runBuildIfExists } from "../npm.ts";
import { updatePackageVersion, type VersionBump } from "../version.ts";
import type { ExecCtx } from "../types.ts";

export const publishPackageMono = async ({
  message = "",
  pathToPackage = "package.json",
  version = "patch",
  ctx,
}: {
  message?: string;
  pathToPackage: string;
  version?: VersionBump;
  ctx?: ExecCtx;
}) => {
  await gitCommitAndPush({
    message: message || createTimeMessage(),
    all: true,
    ctx,
  }).catch(() => {});

  await runBuildIfExists({ pathToPackage, ctx });

  const { name, version: newVersion } = await updatePackageVersion({
    pathToPackage,
    version,
    ctx,
  });

  const tag = `${name}@v${newVersion}`;

  await gitTag({ tag, ctx });
  await gitCommitAndPush({ message: tag, all: true, tag, ctx });
  await publishToNpm({ pathToPackage, ctx });

  return tag;
};
