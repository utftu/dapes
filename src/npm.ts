import { dirname } from "node:path";
import { file } from "bun";
import { execCommandForTask } from "./exec/command.ts";
import { execCommandNativeForTask } from "./exec/command.native.ts";
import type { ExecCtx } from "./types.ts";

export const runBuildIfExists = async ({
  pathToPackage,
  ctx,
}: {
  pathToPackage: string;
  ctx?: ExecCtx;
}) => {
  const content = await file(pathToPackage).json();

  if (!content.scripts?.build) {
    return;
  }

  await execCommandForTask({
    command: "bun run build",
    cwd: dirname(pathToPackage),
    ctx,
  });
};

export const publishToNpm = async ({
  pathToPackage,
  ctx,
}: {
  pathToPackage: string;
  ctx?: ExecCtx;
}) => {
  await execCommandNativeForTask({
    command: "npm publish",
    cwd: dirname(pathToPackage),
    ctx,
  });
};
