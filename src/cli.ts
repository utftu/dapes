#!/usr/bin/env bun
import { writePublishGithubWorkflow } from "./commands/publish-github.ts";
import { writePublishGithubMonoWorkflow } from "./commands/publish-github-mono.ts";
import { publishPackage } from "./commands/publish.ts";
import { publishPackageMono } from "./commands/publish-mono.ts";
import { releasePackage } from "./commands/release.ts";
import {
  releasePackageMono,
  releasePackageMonoRetry,
} from "./commands/release-mono.ts";
import { Cli } from "argblock";

new Cli()
  .command("publish", "Bump version, tag, push and publish to npm")
  .action(async () => {
    await publishPackage();
  })
  .command("publish_mono <package>", "Bump version, tag, push and publish package")
  .action(async (parsedBlock) => {
    await publishPackageMono({
      pathToPackage: `./packages/${parsedBlock.positionals.package}/package.json`,
    });
  })
  .command("publish_github", "Add a GitHub Actions publish workflow")
  .action(async () => {
    await writePublishGithubWorkflow();
  })
  .command(
    "publish_github_mono",
    "Add a GitHub Actions monorepo publish workflow",
  )
  .action(async () => {
    await writePublishGithubMonoWorkflow();
  })
  .command("release", "Bump package version, tag and push")
  .action(async () => {
    await releasePackage();
  })
  .command("release_mono <package>", "Bump package version, tag and push")
  .action(async (parsedBlock) => {
    await releasePackageMono({
      pathToPackage: `./packages/${parsedBlock.positionals.package}/package.json`,
    });
  })
  .command(
    "release_mono_re <package>",
    "Retag current package version and re-push (no version bump)",
  )
  .action(async (parsedBlock) => {
    await releasePackageMonoRetry({
      pathToPackage: `./packages/${parsedBlock.positionals.package}/package.json`,
    });
  })
  .run(process.argv.slice(2));
