import { file } from "bun";
import { execCommand } from "../command.ts";
import type { Task } from "../task.ts";
import { makeBlue } from "../color.ts";

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
  task,
}: {
  pathToPackage: string;
  version: Version;
  task: Task;
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
    task.prefix + makeBlue(`update package ${pathToPackage}`) + "\n"
  );

  return versionNew;
};

const gitPush = async ({ message, task }: { message?: string; task: Task }) => {
  // Формируем сообщение коммита с текущей датой, если не передан пользовательский message
  const commitMessage = message || createTimeMessage();

  // git add .
  await execCommand({ command: "git add .", store: {}, task });

  // git commit
  await execCommand({
    command: `git commit -m "${commitMessage}"`,
    store: {},
    task,
  });

  // Получаем список удаленных репозиториев
  const { stdout } = await execCommand({
    command: "git remote",
    store: {},
    task,
  });
  const remotes = stdout.trim().split("\n");
  for (const remote of remotes) {
    await execCommand({ command: `git push ${remote} --all`, store: {}, task });
  }
};

export const publishPackage = async ({
  task,
  message = "",
  pathToPackage,
  version,
}: {
  task: Task;
  message?: string;
  pathToPackage: string;
  version: Version;
}) => {
  await gitPush({ task, message });
  const newVersion = await updateVesion({ pathToPackage, version, task });
  await execCommand({ command: `git tag ${newVersion}`, store: {}, task });
  await gitPush({ task, message: newVersion });
  await execCommand({ command: `npm publish`, store: {}, task });
};
