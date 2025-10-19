import type { Group } from "./group.ts";
import { Block, parse, globalArg } from "argblock";
import { Task } from "./task.ts";
import { argv, pathToFileURL } from "bun";

const defaultSelectTask = new Task<any>({
  name: "Default select task",
  parents: [],
  exec: ({ prefix }) => {
    throw new Error(prefix + "Default task doesn't exist");
  },
});

type Data = {
  task: Task;
  group: Group;
  optionalArgs?: boolean;
};

const convertGroupToBlock = (group: Group) => {
  const tasksBlocks = group.tasks.map((task) => {
    const children = [];

    if (task.optionalArgs === true) {
      const anyBlock = new Block<Data>({
        arg: task.name,
        matcher: (args, i) => {
          return {
            match: true,
            jumpNext: args.length - i,
          };
        },
        description: task.description,
        params: [],
        data: { task, group, optionalArgs: true },
      });
      children.push(anyBlock);
    }

    return new Block<Data>({
      arg: task.name,
      description: task.description,
      params: [],
      data: { task, group },
      children,
    });
  });

  const subgrupBlocks: Block<Data>[] = group.subgroups.map((subgroup) => {
    const { subgrupBlocks, tasksBlocks } = convertGroupToBlock(subgroup);

    const block = new Block<Data>({
      arg: subgroup.name,
      description: "",
      params: [],
      children: [...tasksBlocks, ...subgrupBlocks],
      data: {
        task: tasksBlocks[0]?.data.task || defaultSelectTask,
        group: subgroup,
      },
    });
    return block;
  });

  return { subgrupBlocks, tasksBlocks };
};

export const start = (group: Group) => {
  process.on("SIGINT", () => {
    console.log("Parent got SIGINT, exiting");
    process.exit(130);
  });

  const { subgrupBlocks, tasksBlocks } = convertGroupToBlock(group);

  const globalBlock = new Block<Data>({
    arg: globalArg,
    description: "",
    children: [...tasksBlocks, ...subgrupBlocks],
    params: [],
    data: {
      task: tasksBlocks[0]?.data.task || defaultSelectTask,
      group: tasksBlocks[0]?.data.group || group,
    },
  });

  const args = process.argv.slice(2);

  const parsedBlocks = parse<Block<Data>>(args, [globalBlock]);

  let selectedPrasedBlock = parsedBlocks.at(-1)!;
  let only = false;
  if (selectedPrasedBlock.arg === "only") {
    only = true;
    selectedPrasedBlock = parsedBlocks.at(-2)!;
  }

  const task = selectedPrasedBlock.block.data.task;
  const finalGroup = selectedPrasedBlock.block.data.group;

  return task.run({
    only,
    taskControl: {
      task,
      needAwait: true,
      group: finalGroup,
    },
    args:
      selectedPrasedBlock.block.data.optionalArgs === true
        ? selectedPrasedBlock.arg
        : "",
  });
};

export const startIfMain = async (group: Group, meta: ImportMeta) => {
  if (meta.url === pathToFileURL(argv[1] || "").href) {
    await start(group);
  }
};
