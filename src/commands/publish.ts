import { file } from "bun";
import { dirname } from "node:path";
import { execCommandForTask } from "../exec/command.ts";
import { execCommandNativeForTask } from "../exec/command.native.ts";
import { gitCommitAndPush, gitTag } from "../git.ts";
import { updatePackageVersion, type VersionBump } from "../version.ts";
import type { ExecCtx } from "../types.ts";

type Version = VersionBump;

const createTimeMessage = () => {
  const commitMessage = new Date().toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  return commitMessage;
};

const commitAndPush = async ({
  message,
  tag,
  ctx,
}: {
  message?: string;
  tag?: string;
  ctx?: ExecCtx;
}) => {
  // Формируем сообщение коммита с текущей датой, если не передан пользовательский message
  const commitMessage = message || createTimeMessage();

  await gitCommitAndPush({ message: commitMessage, all: true, tag, ctx });
};

export const runBuildIfExists = async ({
  pathToPackage,
  ctx,
}: {
  pathToPackage: string;
  ctx?: ExecCtx;
}) => {
  const content = await file(pathToPackage).json();

  if (!content.scripts?.build) {
    return;
  }

  await execCommandForTask({
    command: "bun run build",
    cwd: dirname(pathToPackage),
    ctx,
  });
};

export const publishPackage = async ({
  message = "",
  pathToPackage = "package.json",
  version = "patch",
  ctx,
}: {
  message?: string;
  pathToPackage?: string;
  version?: Version;
  ctx?: ExecCtx;
} = {}) => {
  await commitAndPush({ ctx, message }).catch(() => {});
  const { version: newVersion } = await updatePackageVersion({
    pathToPackage,
    version,
    ctx,
  });
  const tag = `v${newVersion}`;
  await gitTag({ tag, ctx });
  await commitAndPush({ ctx, message: newVersion, tag });
  await runBuildIfExists({ pathToPackage, ctx });
  await execCommandNativeForTask({
    command: `npm publish`,
    ctx,
  });
};
