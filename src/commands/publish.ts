import { createTimeMessage, gitCommitAndPush, gitTag } from "../git.ts";
import { publishToNpm, runBuildIfExists } from "../npm.ts";
import { updatePackageVersion, type VersionBump } from "../version.ts";
import type { ExecCtx } from "../types.ts";

export const publishPackage = async ({
  message = "",
  pathToPackage = "package.json",
  version = "patch",
  ctx,
}: {
  message?: string;
  pathToPackage?: string;
  version?: VersionBump;
  ctx?: ExecCtx;
} = {}) => {
  await gitCommitAndPush({
    message: message || createTimeMessage(),
    all: true,
    ctx,
  }).catch(() => {});

  await runBuildIfExists({ pathToPackage, ctx });

  const { version: newVersion } = await updatePackageVersion({
    pathToPackage,
    version,
    ctx,
  });

  const tag = `v${newVersion}`;

  await gitTag({ tag, ctx });
  await gitCommitAndPush({ message: newVersion, all: true, tag, ctx });
  await publishToNpm({ pathToPackage, ctx });
};
