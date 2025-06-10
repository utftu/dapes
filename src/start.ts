import type { Group } from "./group.ts";
import { Block, parse, globalArg } from "argblock";
import { Task } from "./task.ts";
import { argv, pathToFileURL } from "bun";

const defaultSelectTask = new Task({
  name: "Default select task",
  parents: [],
  exec: ({ prefix }) => {
    throw new Error(prefix + "Default task doesn't exist");
  },
});

type Data = {
  task: Task;
};

const convertGroupToBlock = (group: Group) => {
  const tasksBlocks = group.tasks.map(
    (task) =>
      new Block<Data>({
        arg: task.name,
        description: task.description,
        params: [],
        data: { task },
      })
  );

  const subgrupBlocks: Block<Data>[] = group.subgroups.map((subgroup) => {
    const { subgrupBlocks, tasksBlocks } = convertGroupToBlock(subgroup.group);

    const block = new Block<Data>({
      arg: subgroup.name,
      description: "",
      params: [],
      children: [...tasksBlocks, ...subgrupBlocks],
      data: {
        task: tasksBlocks[0]?.data.task || defaultSelectTask,
      },
    });
    return block;
  });

  return { subgrupBlocks, tasksBlocks };
};

export const start = (group: Group) => {
  const { subgrupBlocks, tasksBlocks } = convertGroupToBlock(group);

  const globalBlock = new Block<Data>({
    arg: globalArg,
    description: "",
    children: [...tasksBlocks, ...subgrupBlocks],
    params: [],
    data: {
      task: tasksBlocks[0]?.data.task || defaultSelectTask,
    },
  });

  const args = process.argv.slice(2);

  const parsedBlocks = parse<Block<Data>>(args, [globalBlock]);

  const task = parsedBlocks.at(-1)!.block.data.task;

  return task.run();
};

export const startIfMain = async (group: Group, meta: ImportMeta) => {
  if (meta.url === pathToFileURL(argv[1] || "").href) {
    await start(group);
  }
};
