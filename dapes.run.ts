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
  exec: async ({ command }) => {
    const gp = `alias gp="git add .; git commit -m "$(date +"%d.%m.%y %H:%M")"; git remote | xargs -L1 git push --all"`;
    await command(`
      gp() {
        git add .;
        git commit -m "$(date +"%d.%m.%y %H:%M")";
        git remote | xargs -L1 git push --all;
      }
      gp && npm version patch && gp && npm publish
    `);
    // await command(`${gp} gp && npm version patch && gp && npm publish`);
  },
});

const group = new Group({
  tasks: [build, types, publish],
});

await startIfMain(group, import.meta);
