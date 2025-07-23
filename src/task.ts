import { randomRgbTextStart } from "./color.ts";
import { execCommandNativeForTask } from "./command.native.ts";
import { execCommandForTask } from "./command.ts";
import type { Group } from "./group.ts";
import type { Exec, ExecCtx, Unmount } from "./types.ts";

export type TaskControl = {
  task: Task;
  needAwait: boolean;
  group?: Group;
};

type TaskUniversal = Task | TaskControl;
const getTaskControlFromUniversal = (
  taskUniversal: TaskUniversal,
  parentTaskControl?: TaskControl
): TaskControl => {
  if (taskUniversal instanceof Task) {
    return {
      task: taskUniversal,
      needAwait: true,
      group: parentTaskControl?.group,
    } satisfies TaskControl;
  }

  return taskUniversal;
};

export class Task<TValue = any> {
  name: string;

  group?: Group;
  optionalArgs: boolean;
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
    optionalArgs = false,
  }: {
    name: string;
    parents?: TaskUniversal[];
    exec: Exec<TValue>;
    description?: string;
    optionalArgs?: boolean;
  }) {
    this.name = name;
    this.parents = parents;
    this.exec = exec;
    this.description = description;
    this.optionalArgs = optionalArgs;
  }

  async run({
    taskControl,
    args = "",
  }: {
    taskControl?: TaskControl;
    args?: string;
  } = {}): Promise<TValue> {
    if (this.promise) {
      return this.promise;
    }

    const parentsResults = await Promise.all(
      this.parents.map(async (task) => {
        const taskControlChild = getTaskControlFromUniversal(task, taskControl);
        const result = taskControlChild.task.run({
          taskControl: taskControlChild,
        });
        return {
          result: taskControlChild.needAwait ? await result : undefined,
          task: taskControlChild.task,
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
      commandNative: (command: string, { env, cwd } = {}) =>
        execCommandNativeForTask({ command, env, ctx: execCtx, cwd }),
      prefix,
      ctx: null as any,
      args: args,
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
        getTaskControlFromUniversal(taskUniversal).task.cancel()
      )
    );
  }

  async abort() {
    this.abortController.abort();
    await Promise.all(this.unmounts.map((unmount) => unmount()));
    this.status = "cancelled";
  }
}
