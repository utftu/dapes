import { Group } from "./group.ts";
import { startIfMain } from "./start.ts";
import { Task } from "./task.ts";

const build = new Task({
  name: "build",
  parents: [],
  exec: ({ prefix }) => {
    console.log(prefix + "build");
  },
});

const wait = new Task({
  name: "wait",
  parents: [],
  exec: async ({ prefix }) => {
    await new Promise((resolve) => setTimeout(resolve, 4000));
    console.log(prefix + "wait");
  },
});

const test = new Task({
  name: "test",
  parents: [build],
  exec: ({ prefix }) => {
    console.log(prefix + "test");
    console.log(prefix + "test1");
    console.log(prefix + "test2");
  },
});

const run = new Task({
  name: "run",
  parents: [build, test, wait],
  exec: async ({ command, prefix }) => {
    console.log(prefix + "run");
    await command("ls");
  },
});

const build2 = new Task({
  name: "build2",
  parents: [],
  exec: ({ prefix }) => {
    console.log(prefix + "build2");
  },
});

const group2 = new Group({ name: "group2", tasks: [build2] });
const group1 = new Group({ name: "group1", tasks: [], subgroups: [group2] });

const group = new Group({
  tasks: [run, test, build],
  subgroups: [group1, group2],
});

startIfMain(group, import.meta);
