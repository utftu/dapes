import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import type { Group } from "./group.ts";
import { Task } from "./task.ts";
import { start } from "./start.ts";

const build = new Task({
  name: "build",
  parents: [],
  exec: () => {
    return "build";
  },
});

// Примерная реализация фиктивной группы
const run = new Task({
  name: "run",
  parents: [],
  exec: () => {
    return "run";
  },
});

const group: Group = {
  tasks: [run, build],
  subgroups: [],
};

describe("CLI start()", () => {
  const originalArgv = process.argv;

  afterEach(() => {
    // Восстанавливаем оригинальные аргументы
    process.argv = originalArgv;
  });

  it("should run the 'build' task", async () => {
    process.argv = ["bun", "script.ts"];
    const result = await start(group);
    expect(result).toBe("run");
  });

  it("should run the 'build' task", async () => {
    process.argv = ["bun", "script.ts", "build"];
    const result = await start(group);
    expect(result).toBe("build");
  });
});
