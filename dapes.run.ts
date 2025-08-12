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
    await command("npm run build");
  },
});

const publish = new Task({
  name: "publish",
  parents: [build],
  beforeExec({ command }) {
    command("rm -rf dist");
  },
  exec: async ({ ctx }) => {
    await publishPackage({
      pathToPackage: "./package.json",
      version: "patch",
      ctx,
    });
  },
});

const group = new Group({
  name: "",
  tasks: [build, types, publish],
});

await startIfMain(group, import.meta);
