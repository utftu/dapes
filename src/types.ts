import type { commandRaw } from "./command.ts";
import type { Task } from "./task.ts";

export type Unmount = () => void | Promise<void>;

export type Exec<TValue = any> = (ctx: ExecCtx) => TValue | Promise<TValue>;

type ExecCtx = {
  task: Task;
  parentResults: ExecResulCtx[];
  command: (command: string) => ReturnType<typeof commandRaw>;
  prefix: string;
};

type ExecResulCtx<TValue = any> = {
  task: Task;
  result: TValue;
};
