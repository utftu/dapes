import type { commandForTask } from "./command.ts";
import type { Task } from "./task.ts";

export type Unmount = () => void | Promise<void>;

export type Exec<TValue = any> = (ctx: ExecCtx) => TValue | Promise<TValue>;

type ExecCtx = {
  task: Task;
  parentResults: ExecResulCtx[];
  command: (
    command: string,
    config?: { env?: Record<string, any> }
  ) => ReturnType<typeof commandForTask>;
  prefix: string;
};

type ExecResulCtx<TValue = any> = {
  task: Task;
  result: TValue;
};

export type Envs = Record<string, any>;
