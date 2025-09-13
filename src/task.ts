import { createControlledPromise } from "utftu";
import { randomRgbTextStart } from "./color.ts";
import { execCommandNativeForTask } from "./command.native.ts";
import { execCommandForTask } from "./command.ts";
import type { Group } from "./group.ts";
import type { Exec, ExecCtx, Unmount } from "./types.ts";
import { resolve } from "bun";

type ParentResult = { task: Task; result: any };

export type TaskControl = {
  task: Task;
  needAwait: boolean;
  group?: Group;
};

const createExecCtx = ({
  parentResults,
  task,
  prefix,
  args,
}: {
  parentResults: ParentResult[];
  task: Task;
  prefix: string;
  args: string;
}) => {
  const execCtx: ExecCtx = {
    task,
    parentResults: parentResults,
    command: (command: string, { env, cwd } = {}) =>
      execCommandForTask({ command, env, ctx: execCtx, cwd }),
    commandNative: (command: string, { env, cwd } = {}) =>
      execCommandNativeForTask({ command, env, ctx: execCtx, cwd }),
    prefix,
    ctx: null as any,
    args: args,
  };
  execCtx.ctx = execCtx;
  return execCtx;
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

  beforeExec?: Exec<void>;
  exec: Exec<TValue>;

  parents: TaskUniversal[] = [];
  children: TaskUniversal[] = [];

  status: "init" | "running" | "finished" | "error" | "cancelled" = "init";
  unmounts: Unmount[] = [];

  abortController = new AbortController();
  promise?: Promise<TValue>;
  promiseEnt: ReturnType<typeof createControlledPromise<TValue>> | undefined;
  // runned = false;

  _colorStart = randomRgbTextStart();

  getPrefix(groupName: string = "") {
    const groupPart = groupName ? `${groupName}:` : "";
    return this._colorStart + groupPart + this.name + ": " + "\x1b[0m";
  }

  constructor({
    name,
    parents = [],
    children = [],
    exec,
    description = "",
    optionalArgs = false,
    beforeExec,
  }: {
    name: string;
    parents?: TaskUniversal[];
    children?: TaskUniversal[];
    exec: Exec<TValue>;
    beforeExec?: Exec<void>;
    description?: string;
    optionalArgs?: boolean;
  }) {
    this.name = name;
    this.parents = parents;
    this.exec = exec;
    this.description = description;
    this.optionalArgs = optionalArgs;
    this.children = children;
    this.beforeExec = beforeExec;
  }

  async run({
    taskControl,
    args = "",
  }: {
    taskControl?: TaskControl;
    args?: string;
  } = {}): Promise<TValue> {
    if (this.promiseEnt) {
      return this.promiseEnt.promise;
    }

    this.promiseEnt = createControlledPromise<TValue>();

    const prefix = this.getPrefix(taskControl?.group?.name);

    if (this.beforeExec) {
      await this.beforeExec(
        createExecCtx({
          parentResults: [],
          task: this,
          prefix,
          args,
        })
      );
    }

    const parentResults: ParentResult[] = [];

    for (const task of this.parents) {
      const taskControlChild = getTaskControlFromUniversal(task, taskControl);
      const result = taskControlChild.task.run({
        taskControl: taskControlChild,
      });
      parentResults.push({
        result: taskControlChild.needAwait ? await result : undefined,
        task: taskControlChild.task,
      });
    }

    const execCtx: ExecCtx = {
      task: this,
      parentResults: parentResults,
      command: (command: string, { env, cwd } = {}) =>
        execCommandForTask({ command, env, ctx: execCtx, cwd }),
      commandNative: (command: string, { env, cwd } = {}) =>
        execCommandNativeForTask({ command, env, ctx: execCtx, cwd }),
      prefix,
      ctx: null as any,
      args: args,
    };
    execCtx.ctx = execCtx;

    const execResult = await this.exec(
      createExecCtx({ parentResults, task: this, prefix, args })
    );

    this.promiseEnt.controls.resolve(execResult);

    for (const task of this.children) {
      const taskControlChild = getTaskControlFromUniversal(task, taskControl);
      const result = taskControlChild.task.run({
        taskControl: taskControlChild,
      });
      taskControlChild.needAwait ? await result : undefined;
    }

    return execResult;
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
