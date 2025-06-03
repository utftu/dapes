import { spawn } from "bun";
import type { Task } from "./task.ts";

const makeGreen = (text: string) => "\x1b[32m" + text + "\x1b[0m";

const tee = async (
  read: ReadableStream,
  write: (text: string) => void,
  prefix: string
) => {
  const reader = read.getReader();
  let leftover = "";
  let output = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) {
      if (leftover) write(prefix + leftover + "\n");
      return output;
    }

    const decoder = new TextDecoder("utf-8");

    output += decoder.decode(value, { stream: true });

    const lines = (leftover + output).split("\n");
    leftover = lines.pop() ?? "";

    for (const line of lines) {
      write(prefix + line + "\n");
    }
  }
};

const teeStdout = (read: ReadableStream, prefix: string) =>
  tee(read, (text) => process.stdout.write(text), prefix);
const teeStderr = (read: ReadableStream, prefix: string) =>
  tee(read, (text) => process.stderr.write(text), prefix);

export type ExecCommandStore = { spawnResult?: ReturnType<typeof spawn> };
export const execCommand = async (
  command: string,
  store: ExecCommandStore,
  task: Task
) => {
  process.stdout.write(task.prefix + makeGreen(command) + "\n");

  const spawnResult = spawn(["bash", "-c", command], {
    stdin: "inherit",
    stdout: "pipe",
    stderr: "pipe",
  });

  store.spawnResult = spawnResult;

  const [stdout, stderr] = await Promise.all([
    teeStdout(spawnResult.stdout, task.prefix),
    teeStderr(spawnResult.stderr, task.prefix),
  ]);

  await spawnResult.exited;

  return {
    stderr,
    stdout,
    spawnResult,
  };
};

export const commandRaw = async (command: string, task: Task) => {
  const store: ExecCommandStore = {};
  const resultPromise = execCommand(command, store, task);

  task.abortController.signal.addEventListener("abort", () => {
    store.spawnResult!.kill();
  });

  return resultPromise;
};
