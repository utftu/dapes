import { dirname } from "node:path";
import { execCommandForTask, getGitRemotes } from "../command.ts";
import { updatePackageVersion, type VersionBump } from "../version.ts";
import type { ExecCtx } from "../types.ts";

export const deployPackage = async ({
  pathToPackage = "package.json",
  version = "patch",
  ctx,
}: {
  pathToPackage?: string;
  version?: VersionBump;
  ctx: ExecCtx;
}) => {
  const packageDir = dirname(pathToPackage);

  const { name, version: newVersion } = await updatePackageVersion({
    pathToPackage,
    version,
    ctx,
  });

  const tag = `${name}@v${newVersion}`;

  await execCommandForTask({
    command: `git add ${packageDir}`,
    ctx,
  });
  await execCommandForTask({
    command: `git commit -m "${tag}"`,
    ctx,
  });
  await execCommandForTask({
    command: `git tag ${tag}`,
    ctx,
  });

  const remotes = await getGitRemotes({ ctx });
  for (const remote of remotes) {
    await execCommandForTask({
      command: `git push ${remote}`,
      ctx,
    });
    await execCommandForTask({
      command: `git push ${remote} ${tag}`,
      ctx,
    });
  }

  return tag;
};
