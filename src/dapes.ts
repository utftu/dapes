import { Task } from "./task.ts";

const build = new Task({
  name: "build",
  parents: [],
  exec: () => {
    console.log("build");
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

run.run();
