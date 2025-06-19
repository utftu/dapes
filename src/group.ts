import type { Task, TaskControl } from "./task.ts";

export class Group {
  name: string;
  tasks: Task[];
  subgroups: Group[];
  constructor({
    tasks,
    subgroups = [],
    name,
  }: {
    name: string;
    tasks: Task[];
    subgroups?: Group[];
  }) {
    this.name = name;
    this.tasks = tasks;
    this.subgroups = subgroups;
  }

  getTaskControl(name: string): TaskControl {
    for (const task of this.tasks) {
      if (task.name === name) {
        return {
          task: task,
          needAwait: true,
          group: this,
        } satisfies TaskControl;
      }
    }

    throw new Error(`Not task with name ${name}`);
  }
}
