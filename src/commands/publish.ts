import { file } from "bun";
import { dirname } from "node:path";
import { execCommandForTask, getGitRemotes } from "../command.ts";
import { execCommandNativeForTask } from "../command.native.ts";
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

const gitPush = async ({
  message,
  tag,
  ctx,
}: {
  message?: string;
  tag?: string;
  ctx: ExecCtx;
}) => {
  // Формируем сообщение коммита с текущей датой, если не передан пользовательский message
  const commitMessage = message || createTimeMessage();

  // git add .
  await execCommandForTask({
    command: "git add .",
    ctx,
  });

  // git commit
  await execCommandForTask({
    command: `git commit -m "${commitMessage}"`,
    ctx,
  });

  const remotes = await getGitRemotes({ ctx });
  for (const remote of remotes) {
    await execCommandForTask({
      command: `git push ${remote} --all`,
      ctx,
    });
    if (tag) {
      await execCommandForTask({
        command: `git push ${remote} ${tag}`,
        ctx,
      });
    }
  }
};

const runBuildIfExists = async ({
  pathToPackage,
  ctx,
}: {
  pathToPackage: string;
  ctx: ExecCtx;
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
  ctx: ExecCtx;
}) => {
  await gitPush({ ctx, message }).catch(() => {});
  const { version: newVersion } = await updatePackageVersion({
    pathToPackage,
    version,
    ctx,
  });
  const tag = `v${newVersion}`;
  await execCommandForTask({
    command: `git tag ${tag}`,
    ctx,
  });
  await gitPush({ ctx, message: newVersion, tag });
  await runBuildIfExists({ pathToPackage, ctx });
  await execCommandNativeForTask({
    command: `npm publish`,
    ctx,
  });
};
