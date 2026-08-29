#!/usr/bin/env bun
import { writePublishGithubWorkflow } from "./commands/publish-github.ts";
import { writePublishGithubMonoWorkflow } from "./commands/publish-github-mono.ts";

const [command] = process.argv.slice(2);

if (command === "publish_github") {
  await writePublishGithubWorkflow();
} else if (command === "publish_github_mono") {
  await writePublishGithubMonoWorkflow();
} else {
  console.log("Usage: dapes publish_github | publish_github_mono");
  process.exit(1);
}
