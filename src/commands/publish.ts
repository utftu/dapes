import { file } from "bun";
import { execCommandForTask, execCommandForTaskMayError } from "../command.ts";
import { makeBlue } from "../color.ts";
import type { ExecCtx } from "../types.ts";

type Version = "major" | "minor" | "patch";

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

const updateVesion = async ({
  pathToPackage,
  version,
  ctx,
}: {
  pathToPackage: string;
  version: Version;
  ctx: ExecCtx;
}) => {
  const filePackage = file(pathToPackage);

  const content = await filePackage.json();
  const [major, minor, patch] = content.version.split(".");
  let versionNew!: string;

  if (version === "patch") {
    versionNew = `${major}.${minor}.${+patch + 1}`;
  }
  if (version === "minor") {
    versionNew = `${major}.${+minor + 1}.0`;
  }
  if (version === "major") {
    versionNew = `${+major + 1}.0.0`;
  }

  content.version = versionNew;

  filePackage.write(JSON.stringify(content, null, 2));

  process.stdout.write(
    ctx.prefix + makeBlue(`update package ${pathToPackage}`) + "\n"
  );

  return versionNew;
};

const gitPush = async ({
  message,
  ctx,
}: {
  message?: string;
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

  // Получаем список удаленных репозиториев
  const { stdout } = await execCommandForTask({
    command: "git remote",
    ctx,
  });
  const remotes = stdout.trim().split("\n");
  for (const remote of remotes) {
    await execCommandForTask({
      command: `git push ${remote} --all`,
      ctx,
    });
  }
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
  const newVersion = await updateVesion({
    pathToPackage,
    version,
    ctx,
  });
  await execCommandForTask({
    command: `git tag ${newVersion}`,
    ctx,
  });
  await gitPush({ ctx, message: newVersion });
  await execCommandForTask({
    command: `npm publish`,
    ctx,
  });
};
