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
