import { dirname } from "node:path";
import { gitTag } from "../git.ts";
import { updatePackageVersion, type VersionBump } from "../version.ts";
import type { ExecCtx } from "../types.ts";
import { execCommandNativeForTask } from "../exec/command.native.ts";
import { commitAndPush, runBuildIfExists } from "./publish.ts";

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
  const packageDir = dirname(pathToPackage);

  await commitAndPush({ ctx, message }).catch(() => {});
  const { name, version: newVersion } = await updatePackageVersion({
    pathToPackage,
    version,
    ctx,
  });

  const tag = `${name}@v${newVersion}`;

  await gitTag({ tag, ctx });
  await commitAndPush({ ctx, message: newVersion, tag });

  await runBuildIfExists({ pathToPackage, ctx });
  await execCommandNativeForTask({
    command: "npm publish",
    cwd: packageDir,
    ctx,
  });

  return tag;
};