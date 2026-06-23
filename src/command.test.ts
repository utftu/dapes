import { expect, test, beforeAll } from "bun:test";
import { Task } from "./task.ts";

if (!process.env.DEBUG) {
  const noop = () => false;
  beforeAll(() => {
    process.stdout.write = noop as any;
    process.stderr.write = noop as any;
  });
}

const runFailingCommand = async (cmd: string) => {
  const task = new Task({
    name: "fail",
    exec: async ({ command }) => {
      await command(cmd);
    },
  });
  let error: Error | undefined;
  try {
    await task.run();
  } catch (e) {
    error = e as Error;
  }
  return error;
};

test("exits with the command's exit code", async () => {
  const error = await runFailingCommand("exit 7");
  expect(error?.message).toContain("exitCode: 7");
});

test("stack does not contain command.ts", async () => {
  const error = await runFailingCommand("exit 1");
  expect(error?.stack).not.toContain("command.ts");
});

test("stack contains caller file", async () => {
  const error = await runFailingCommand("exit 1");
  expect(error?.stack).toContain("command.test.ts");
});

test("user error thrown directly propagates unchanged", async () => {
  const task = new Task({
    name: "fail",
    exec: async () => {
      throw new Error("IT");
    },
  });
  let error: Error | undefined;
  try {
    await task.run();
  } catch (e) {
    error = e as Error;
  }
  expect(error?.message).toBe("IT");
});

test("successful command does not throw", async () => {
  const task = new Task({
    name: "ok",
    exec: async ({ command }) => {
      await command("exit 0");
    },
  });
  await expect(task.run()).resolves.toBeUndefined();
});
