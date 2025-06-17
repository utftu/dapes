import { publishPackage } from "./src/dapes.ts";
import { Group } from "./src/group.ts";
import { startIfMain } from "./src/start.ts";
import { Task } from "./src/task.ts";

const types = new Task({
  name: "types",
  exec: async ({ command }) => {
    await command("npm run types");
  },
});

const build = new Task({
  name: "build",
  parents: [types],
  exec: async ({ command }) => {
    await command("npm run build1");
  },
});

const publish = new Task({
  name: "publish",
  // parents: [build],
  exec: async ({ task }) => {
    await publishPackage({
      pathToPackage: "./package.json",
      version: "patch",
      task,
    });
  },
});

const group = new Group({
  tasks: [build, types, publish],
});

await startIfMain(group, import.meta);
