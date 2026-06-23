import { Task } from "./src/task.ts";

const task = new Task({
  name: "fail",
  exec: async ({ command }) => {
    // throw new Error("IT");
    await command("exit 2");
  },
});

await task.run();
