import { Group } from "./group.ts";
import { start } from "./start.ts";
import { Task } from "./task.ts";

const build = new Task({
  name: "build",
  parents: [],
  exec: ({ task }) => {
    console.log(task.prefix + "build");
  },
});

const test = new Task({
  name: "test",
  parents: [build],
  exec: ({ task }) => {
    console.log(task.prefix + "test");
    console.log(task.prefix + "test1");
    console.log(task.prefix + "test2");
  },
});

const run = new Task({
  name: "run",
  parents: [build, test],
  exec: async ({ command, task }) => {
    console.log(task.prefix + "run");
    await command("ls");
  },
});

start(
  new Group({
    tasks: [run, build, test],
    subgroups: [],
  })
);
