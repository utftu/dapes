#!/usr/bin/env bun
import { writePublishGithubWorkflow } from "./commands/publish-github.ts";
import { writePublishGithubMonoWorkflow } from "./commands/publish-github-mono.ts";
import { Cli } from "argblock";

const [command] = process.argv.slice(2);

const cli = new Cli().command("release");

// if (command === "publish_github") {
//   await writePublishGithubWorkflow();
// } else if (command === "publish_github_mono") {
//   await writePublishGithubMonoWorkflow();
// } else if () else {
//   console.log("Usage: dapes publish_github | publish_github_mono");
//   process.exit(1);
// }
