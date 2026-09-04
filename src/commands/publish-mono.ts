import { dirname } from "node:path";
import {
  gitAdd,
  gitCommit,
  gitPushRemotes,
  gitTag,
} from "../git.ts";
import { updatePackageVersion, type VersionBump } from "../version.ts";
import type { ExecCtx } from "../types.ts";
import { execCommandNativeForTask } from "../exec/command.native.ts";
import { runBuildIfExists } from "./publish.ts";

export const publishPackageMono = async ({
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

  await runBuildIfExists({ pathToPackage, ctx });
  await execCommandNativeForTask({
    command: "npm publish",
    cwd: packageDir,
    ctx,
  });

  return tag;
};