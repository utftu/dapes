import { spawn } from "bun";
import type { Envs, ExecCtx } from "../types.ts";

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
  ctx?: ExecCtx;
}) => {
  const store: ExecCommandStore = {};
  const signal = ctx?.task.abortController.signal;
  const resultPromise = execCommandRaw({
    command,
    store,
    signal,
    env,
    prefix: ctx?.prefix ?? "",
    cwd,
  });

  signal?.addEventListener("abort", () => {
    store.spawnResult!.kill();
  });

  const result = await resultPromise;
  if (result.spawnResult.exitCode === 130) {
    console.log("Received SIGINT, exiting gracefully...");
    process.exit(130);
  }

  if (result.spawnResult.exitCode !== 0) {
    const err = new Error(
      `Command: ${command}, exitCode: ${result.spawnResult.exitCode}`,
    );
    const thisFile = import.meta.filename;
    const callerFrames =
      err.stack
        ?.split("\n")
        .slice(1)
        .filter((l) => !l.includes(thisFile)) ?? [];
    err.stack = `${err.message}\n${callerFrames.join("\n")}`;
    throw err;
  }

  return resultPromise;
};
