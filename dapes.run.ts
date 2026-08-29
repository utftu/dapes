import { publishPackageLocal } from "./src/dapes.ts";
import { Group } from "./src/group.ts";
import { startIfMain } from "./src/start/start.ts";
import { Task } from "./src/task/task.ts";

const publishLocal = new Task({
  name: "publish_local",
  parents: [],
  beforeExec({ command }) {
    command("rm -rf dist");
  },
  exec: async ({ ctx }) => {
    await publishPackageLocal({
      ctx,
    });
  },
});

const publish = new Task({
  name: "publish",
  exec: ({ ctx }) => {
    await;
  },
});

const group = new Group({
  name: "",
  tasks: [publishLocal],
});

await startIfMain(group, import.meta);
