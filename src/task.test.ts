import { expect, test } from "bun:test";
import { Task } from "./task.ts";

test("single", async () => {
  const results: string[] = [];
  const task = new Task({
    name: "test",
    exec: () => {
      results.push("test");
    },
  });

  await task.run();

  expect(results.length).toBe(1);
  expect(results[0]).toBe("test");
});

test("parents", async () => {
  const results: string[] = [];
  const build = new Task({
    name: "build",
    exec: () => {
      results.push("build");
    },
  });

  const test = new Task({
    name: "test",
    parents: [build],
    exec: () => {
      results.push("test");
    },
  });

  const run = new Task({
    name: "run",
    parents: [test, build],
    exec: () => {
      results.push("run");
    },
  });

  await run.run();

  expect(results).toEqual(["build", "test", "run"]);
});

test("status transitions on success", async () => {
  const task = new Task({
    name: "test",
    exec: () => {},
  });

  expect(task.status).toBe("init");
  await task.run();
  expect(task.status).toBe("finished");
});

test("status transitions on error", async () => {
  const task = new Task({
    name: "test",
    exec: () => {
      throw new Error("fail");
    },
  });

  expect(task.status).toBe("init");
  await task.run().catch(() => {});
  expect(task.status).toBe("error");
});

test("cancel aborts the task", async () => {
  const task = new Task({
    name: "test",
    exec: () => {},
  });

  await task.cancel();
  expect(task.status).toBe("cancelled");
});

test("second run() call returns same promise", async () => {
  let count = 0;
  const task = new Task({
    name: "test",
    exec: () => {
      count++;
    },
  });

  await Promise.all([task.run(), task.run()]);
  expect(count).toBe(1);
});
