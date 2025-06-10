import { Group, Subgroup } from "./group.ts";
import { start, startIfMain } from "./start.ts";
import { Task } from "./task.ts";

const build = new Task({
  name: "build",
  parents: [],
  exec: ({ prefix }) => {
    console.log(prefix + "123");
    // console.log(task.prefix + "build");
  },
});

const wait = new Task({
  name: "wait",
  parents: [],
  exec: async ({ prefix }) => {
    await new Promise((resolve) => setTimeout(resolve, 4000));
    console.log(prefix + "123");
    // console.log(task.prefix + "build");
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
  parents: [build, test, wait],
  exec: async ({ command, task }) => {
    console.log(task.prefix + "run");
    await command("ls");
  },
});

const build2 = new Task({
  name: "build2",
  parents: [],
  exec: ({ task }) => {
    console.log(task.prefix + "build2");
  },
});

const group2 = new Group({
  tasks: [build2],
});

const group1 = new Group({
  tasks: [],
  subgroups: [new Subgroup({ name: "group2", group: group2 })],
});

const group = new Group({
  tasks: [run, test, build],
  subgroups: [
    new Subgroup({ name: "group1", group: group1 }),
    new Subgroup({ name: "group2", group: group2 }),
  ],
});

startIfMain(group, import.meta);

// start(
//   new Group({
//     tasks: [run, build, test],
//     subgroups: [new Subgroup({ name: "group1", group: group1 })],
//   })
// );
