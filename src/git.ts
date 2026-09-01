import { execCommandForTask } from "./exec/command.ts";
import type { ExecCtx } from "./types.ts";

export const getGitRemotes = async ({ ctx }: { ctx?: ExecCtx }) => {
  const { stdout } = await execCommandForTask({ command: "git remote", ctx });

  return stdout.trim().split("\n").filter(Boolean);
};

export const gitAdd = async ({
  path = ".",
  ctx,
}: {
  path?: string;
  ctx?: ExecCtx;
}) => {
  await execCommandForTask({ command: `git add ${path}`, ctx });
};

export const gitCommit = async ({
  message,
  ctx,
}: {
  message: string;
  ctx?: ExecCtx;
}) => {
  await execCommandForTask({ command: `git commit -m "${message}"`, ctx });
};

export const gitTag = async ({
  tag,
  ctx,
}: {
  tag: string;
  ctx?: ExecCtx;
}) => {
  await execCommandForTask({ command: `git tag ${tag}`, ctx });
};

export const gitDeleteTag = async ({
  tag,
  ctx,
}: {
  tag: string;
  ctx?: ExecCtx;
}) => {
  await execCommandForTask({ command: `git tag -d ${tag}`, ctx }).catch(
    () => {},
  );

  const remotes = await getGitRemotes({ ctx });
  for (const remote of remotes) {
    await execCommandForTask({
      command: `git push ${remote} :refs/tags/${tag}`,
      ctx,
    }).catch(() => {});
  }
};

export const gitPushRemotes = async ({
  all = false,
  tag,
  ctx,
}: {
  all?: boolean;
  tag?: string;
  ctx?: ExecCtx;
}) => {
  const remotes = await getGitRemotes({ ctx });

  for (const remote of remotes) {
    await execCommandForTask({
      command: `git push ${remote}${all ? " --all" : ""}`,
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
