import type { Task } from "./task.ts";

export type Subgroup = {
  name: string;
  group: Group;
};

export class Group {
  tasks: Task[];
  subgroups: Subgroup[];
  constructor({
    tasks,
    subgroups = [],
  }: {
    tasks: Task[];
    subgroups?: Subgroup[];
  }) {
    this.tasks = tasks;
    this.subgroups = subgroups;
  }
}
