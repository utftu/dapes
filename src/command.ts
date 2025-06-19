import { spawn } from "bun";
import type { Task } from "./task.ts";
import type { Envs, ExecCtx } from "./types.ts";
import { makeGreen } from "./color.ts";

const tee = async (
  read: ReadableStream,
  write: (text: string) => void,
  prefix: string
) => {
  const reader = read.getReader();
  let leftover = "";
  let output = "";

  const decoder = new TextDecoder("utf-8");

  while (true) {
    const { value, done } = await reader.read();
    if (done) {
      if (leftover) write(prefix + leftover + "\n");
      return output;
    }

    const decodedOutput = decoder.decode(value, { stream: true });
    output += decodedOutput;

    const lines = (leftover + decodedOutput).split("\n");
    leftover = lines.pop() ?? "";

    for (const line of lines) {
      write(prefix + line + "\n");
    }
  }
};

const teeStdout = (read: ReadableStream, prefix: string) => {
  return tee(read, (text) => process.stdout.write(text), prefix);
};
const teeStderr = (read: ReadableStream, prefix: string) => {
  tee(read, (text) => process.stderr.write(text), prefix);
};

export type ExecCommandStore = { spawnResult?: ReturnType<typeof spawn> };

const execCommandRaw = async ({
  command,
  store,
  task,
  env,
  cwd,
  prefix = "",
}: {
  command: string;
  store: ExecCommandStore;
  task: Task;
  env?: Envs;
  cwd?: string;
  prefix: string;
}) => {
  process.stdout.write(prefix + makeGreen(command) + "\n");

  const spawnResult = spawn(["bash", "-c", command], {
    stdin: "inherit",
    stdout: "pipe",
    stderr: "pipe",
    signal: task.abortController.signal,
    cwd,
    env,
  });

  store.spawnResult = spawnResult;

  const [stdout, stderr] = await Promise.all([
    teeStdout(spawnResult.stdout, prefix),
    teeStderr(spawnResult.stderr, prefix),
  ]);

  await spawnResult.exited;

  return {
    stderr,
    stdout,
    spawnResult,
  };
};

export const execCommand = async (
  params: Parameters<typeof execCommandRaw>[0]
): ReturnType<typeof execCommandRaw> => {
  const result = await execCommandRaw(params);
  if (result.spawnResult.exitCode !== 0) {
    throw new Error(
      `Command: >>>${params.command}<<< exitCode: >>>${result.spawnResult.exitCode}<<<`
    );
  }

  return result;
};

export const execCommandForTask = async ({
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
  const resultPromise = execCommand({
    command,
    store,
    task: ctx.task,
    env,
    prefix: ctx.prefix,
    cwd,
  });

  ctx.task.abortController.signal.addEventListener("abort", () => {
    store.spawnResult!.kill();
  });

  return resultPromise;
};
