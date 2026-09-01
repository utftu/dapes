import { file } from "bun";
import { makeBlue } from "./color.ts";
import type { ExecCtx } from "./types.ts";

export type VersionBump = "major" | "minor" | "patch";

export const bumpSemver = (version: string, bump: VersionBump) => {
  const [major, minor, patch] = version.split(".") as [string, string, string];

  if (bump === "major") return `${+major + 1}.0.0`;
  if (bump === "minor") return `${major}.${+minor + 1}.0`;
  return `${major}.${minor}.${+patch + 1}`;
};

export const readPackageInfo = async ({
  pathToPackage,
}: {
  pathToPackage: string;
}) => {
  const content = await file(pathToPackage).json();

  return { name: content.name as string, version: content.version as string };
};

export const updatePackageVersion = async ({
  pathToPackage,
  version,
  ctx,
}: {
  pathToPackage: string;
  version: VersionBump;
  ctx?: ExecCtx;
}) => {
  const filePackage = file(pathToPackage);
  const content = await filePackage.json();

  const versionNew = bumpSemver(content.version, version);
  content.version = versionNew;

  await filePackage.write(JSON.stringify(content, null, 2));

  process.stdout.write(
    (ctx?.prefix ?? "") + makeBlue(`update package ${pathToPackage}`) + "\n",
  );

  return { name: content.name as string, version: versionNew };
};
