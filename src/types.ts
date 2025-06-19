import type { execCommandForTask } from "./command.ts";
import type { Task } from "./task.ts";

export type Unmount = () => void | Promise<void>;

export type Exec<TValue = any> = (ctx: ExecCtx) => TValue | Promise<TValue>;

export type ExecCtx = {
  task: Task;
  parentResults: ExecResulCtx[];
  command: (
    command: string,
    config?: { env?: Record<string, any>; cwd?: string }
  ) => ReturnType<typeof execCommandForTask>;
  prefix: string;
  ctx: ExecCtx;
};

type ExecResulCtx<TValue = any> = {
  task: Task;
  result: TValue;
};

export type Envs = Record<string, any>;
