#!/usr/bin/env bun
import { writePublishGithubWorkflow } from "./commands/publish-github.ts";

const [command] = process.argv.slice(2);

if (command === "publish_github") {
  await writePublishGithubWorkflow();
} else {
  console.log("Usage: dapes publish_github");
  process.exit(1);
}
