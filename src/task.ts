import { randomRgbTextStart } from "./color.ts";
import { commandForTask } from "./command.ts";
import type { Exec, Unmount } from "./types.ts";

type TaskControlType = {
  task: Task;
  needAwait: boolean;
};

type TaskUniversal = Task | TaskControl;
const getTaskConttolFromUniversal = (
  taskUniversal: TaskUniversal
): TaskControl => {
  if (taskUniversal instanceof Task) {
    return {
      task: taskUniversal,
      needAwait: true,
    };
  }

  return taskUniversal;
};

export class Task<TValue = any> {
  name: string;
  description: string;
  exec: Exec<TValue>;

  parents: TaskUniversal[] = [];
  // children: Task[] = [];

  status: "init" | "running" | "finished" | "error" | "cancelled" = "init";
  unmounts: Unmount[] = [];

  abortController = new AbortController();
  promise?: Promise<TValue>;

  _colorStart = randomRgbTextStart();

  get prefix() {
    return this._colorStart + this.name + ": " + "\x1b[0m";
  }

  constructor({
    name,
    parents = [],
    exec,
    description = "",
  }: {
    name: string;
    parents?: TaskUniversal[];
    exec: Exec<TValue>;
    description?: string;
  }) {
    this.name = name;
    this.parents = parents;
    this.exec = exec;
    this.description = description;
  }

  async run(): Promise<TValue> {
    if (this.promise) {
      return this.promise;
    }

    const parentsResults = await Promise.all(
      this.parents.map(async (task) => {
        const taskControl = getTaskConttolFromUniversal(task);
        const result = taskControl.task.run();
        return {
          result: taskControl.needAwait ? await result : undefined,
          task: taskControl.task,
        };
      })
    );

    if (this.promise) {
      return this.promise;
    }

    const promise = this.exec({
      task: this,
      parentResults: parentsResults,
      command: (command: string, { env } = {}) =>
        commandForTask({ command, task: this, env }),
      prefix: this.prefix,
    });

    this.promise =
      promise instanceof Promise ? promise : Promise.resolve(promise);

    const value = await promise;

    return value;
  }

  async cancel() {
    if (
      this.status === "finished" ||
      this.status === "error" ||
      this.status === "cancelled"
    ) {
      return;
    }

    await this.abort();

    await Promise.all(
      this.parents.map((taskUniversal) =>
        getTaskConttolFromUniversal(taskUniversal).task.cancel()
      )
    );
  }

  async abort() {
    this.abortController.abort();
    await Promise.all(this.unmounts.map((unmount) => unmount()));
    this.status = "cancelled";
  }
}

export class TaskControl implements TaskControlType {
  task: Task;
  needAwait: boolean;
  constructor({ task, needAwait }: { task: Task; needAwait: boolean }) {
    this.task = task;
    this.needAwait = needAwait;
  }
}
