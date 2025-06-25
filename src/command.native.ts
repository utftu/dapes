import { spawn } from "bun";
import type { Envs, ExecCtx } from "./types.ts";

export type ExecCommandStore = { spawnResult?: ReturnType<typeof spawn> };

const execCommandRaw = async ({
  command,
  store,
  env,
  cwd,
  signal,
}: {
  command: string;
  store: ExecCommandStore;
  env?: Envs;
  cwd?: string;
  prefix: string;
  signal?: AbortSignal;
}) => {
  const spawnResult = spawn(["bash", "-c", command], {
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
    signal,
    cwd,
    env,
  });

  store.spawnResult = spawnResult;

  await spawnResult.exited;

  return {
    spawnResult,
  };
};

export const execCommandNativeForTask = async ({
  command,
  ctx,
  env,
  cwd,
}: {
  command: string;
  env?: Envs;
  cwd?: string;
  ctx: ExecCtx;
}) => {
  const store: ExecCommandStore = {};
  const resultPromise = execCommandRaw({
    command,
    store,
    signal: ctx.task.abortController.signal,
    env,
    prefix: ctx.prefix,
    cwd,
  });

  ctx.task.abortController.signal.addEventListener("abort", () => {
    store.spawnResult!.kill();
  });

  const result = await resultPromise;
  if (result.spawnResult.exitCode === 130) {
    console.log("Received SIGINT, exiting gracefully...");
    process.exit(130);
  }

  if (result.spawnResult.exitCode !== 0) {
    throw new Error(
      `Command: ${command}, exitCode: ${result.spawnResult.exitCode}`
    );
  }

  return resultPromise;
};
