import { randomRgbTextStart } from "./color.ts";
import { execCommandForTask } from "./command.ts";
import type { Group } from "./group.ts";
import type { Exec, ExecCtx, Unmount } from "./types.ts";

export type TaskControl = {
  task: Task;
  needAwait: boolean;
  group?: Group;
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

  group?: Group;
  description: string;
  exec: Exec<TValue>;

  parents: TaskUniversal[] = [];

  status: "init" | "running" | "finished" | "error" | "cancelled" = "init";
  unmounts: Unmount[] = [];

  abortController = new AbortController();
  promise?: Promise<TValue>;

  _colorStart = randomRgbTextStart();

  getPrefix(groupName: string = "") {
    const groupPart = groupName ? `${groupName}:` : "";
    return this._colorStart + groupPart + this.name + ": " + "\x1b[0m";
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

  async run({
    taskControl,
  }: {
    taskControl?: TaskControl;
  } = {}): Promise<TValue> {
    if (this.promise) {
      return this.promise;
    }

    const parentsResults = await Promise.all(
      this.parents.map(async (task) => {
        const taskControl = getTaskConttolFromUniversal(task);
        const result = taskControl.task.run({ taskControl });
        return {
          result: taskControl.needAwait ? await result : undefined,
          task: taskControl.task,
        };
      })
    );

    if (this.promise) {
      return this.promise;
    }

    const prefix = this.getPrefix(taskControl?.group?.name);

    const execCtx: ExecCtx = {
      task: this,
      parentResults: parentsResults,
      command: (command: string, { env, cwd } = {}) =>
        execCommandForTask({ command, env, ctx: execCtx, cwd }),
      prefix,
      ctx: null as any,
    };
    execCtx.ctx = execCtx;

    const promise = this.exec(execCtx);

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
