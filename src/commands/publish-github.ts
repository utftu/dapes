import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { file } from "bun";

const WORKFLOW = `name: Publish

on:
  push:
    tags:
      - "v*.*.*"
  workflow_dispatch:

jobs:
  publish:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      id-token: write

    steps:
      - uses: actions/checkout@v6

      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest

      - run: bun install --frozen-lockfile

      - run: bunx tsc --noEmit

      - run: bun test

      - run: bun run build

      - run: npm install -g npm@latest

      - run: npm publish
`;

export const writePublishGithubWorkflow = async ({
  cwd = process.cwd(),
}: {
  cwd?: string;
} = {}) => {
  const dir = join(cwd, ".github", "workflows");
  const path = join(dir, "publish.yml");

  await mkdir(dir, { recursive: true });
  await file(path).write(WORKFLOW);

  console.log(`создан ${path}`);
  console.log(
    "не забудьте настроить Trusted Publisher для пакета на npmjs.com (Settings → Trusted Publishers) под этот workflow",
  );
};
