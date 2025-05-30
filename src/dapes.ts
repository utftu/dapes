// import { execCommand } from "ramm";

const execCommandMay = async (command: string) => {
  debugCommand(command);
  const result = spawn(["bash", "-c", command], {
    stdin: "inherit",
    stdout: "inherit", // Перехватываем stdout
    stderr: "inherit",
  });

  const [output, outputErr] = await Promise.all([
    tee(result.stdout),
    teeErr(result.stderr),
  ]);

  await result.exited;

  return {
    outputErr,
    output,
    spawnResult: result,
  };
};

type Exec<TValue = any> = (ctx: ExecCtx) => TValue | Promise<TValue>;

type ExecCtx = {
  task: Task;
  parentResults: ExecResulCtx[];
  command: typeof execCommand;
};

type ExecResulCtx<TValue = any> = {
  task: Task;
  result: TValue;
};

const makeBlue = (text: string) => "\x1b[36m" + text + "\x1b[0m";

type Unmount = () => void | Promise<void>;

const runCommand = (command: string, task: Task) => {
  const result = execCommand(command);

  task.unmounts.push(() => result);

  return result;
};

class Task<TValue = any> {
  name: string;
  exec: Exec<TValue>;

  parents: Task[] = [];
  children: Task[] = [];

  abortController = new AbortController();
  promise?: Promise<TValue>;

  unmounts: Unmount[] = [];

  constructor({
    name,
    parents,
    exec,
  }: {
    name: string;
    parents: Task[];
    exec: Exec<TValue>;
  }) {
    this.name = name;
    this.parents = parents;
    this.exec = exec;
  }

  async run(): Promise<TValue> {
    if (this.promise) {
      return this.promise;
    }

    const parentsResults = await Promise.all(
      this.parents.map(async (task) => ({
        result: await task.run(),
        task,
      }))
    );

    if (this.promise) {
      return this.promise;
    }

    console.log(makeBlue(`${this.name} start  ↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓`));
    const promise = this.exec({
      task: this,
      parentResults: parentsResults,
      command: execCommand,
    });
    this.promise =
      promise instanceof Promise ? promise : Promise.resolve(promise);

    const value = await promise;

    console.log(makeBlue(`${this.name} funish ↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑`));

    return value;
  }
}

const build = new Task({
  name: "build",
  parents: [],
  exec: () => {
    console.log("build");
  },
});

const test = new Task({
  name: "test",
  parents: [build],
  exec: () => {
    console.log("test");
  },
});

const run = new Task({
  name: "run",
  parents: [build, test],
  exec: async ({ command }) => {
    console.log("run");
    await command("ls");
  },
});

run.run();
