import { expect, test, beforeAll, afterAll } from "bun:test";
import { Task } from "./task.ts";

if (!process.env.DEBUG) {
  const noop = () => false;
  beforeAll(() => {
    process.stdout.write = noop as any;
    process.stderr.write = noop as any;
  });
  afterAll(() => {
    process.stdout.write = process.stdout.constructor.prototype.write.bind(process.stdout);
    process.stderr.write = process.stderr.constructor.prototype.write.bind(process.stderr);
  });
}

const runFailingCommand = async (cmd: string) => {
  const task = new Task({
    name: "fail",
    exec: async ({ command }) => {
      await command(cmd); // line 8
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

test("error message contains exit code", async () => {
  const error = await runFailingCommand("exit 7");
  expect(error?.message).toContain("exitCode: 7");
});

test("error message second line points to caller file, not command.ts", async () => {
  const error = await runFailingCommand("exit 1");
  const [, frame] = error!.message.split("\n");
  expect(frame).toContain("command.test.ts");
  expect(frame).not.toContain("command.ts:");
});

test("error message has exactly one caller frame", async () => {
  const error = await runFailingCommand("exit 1");
  const lines = error!.message.split("\n");
  expect(lines).toHaveLength(2);
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
  expect(error?.message.split("\n")).toHaveLength(1);
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
