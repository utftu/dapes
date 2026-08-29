import { publishPackage } from "./src/dapes.ts";
import { Group } from "./src/group.ts";
import { startIfMain } from "./src/start/start.ts";
import { Task } from "./src/task/task.ts";

const build = new Task({
  name: "build",
  parents: [],
  exec: async ({ command }) => {
    await command("npm run build");
  },
});

const publish = new Task({
  name: "publish",
  parents: [],
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
  tasks: [build, publish],
});

await startIfMain(group, import.meta);
