import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { file } from "bun";

const WORKFLOW = `name: Publish mono

on:
  push:
    tags:
      - "*@v*.*.*"
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

      - name: Resolve package
        id: pkg
        run: |
          NAME="\${GITHUB_REF_NAME%@v*}"
          echo "name=$NAME" >> "$GITHUB_OUTPUT"
          echo "dir=packages/$NAME" >> "$GITHUB_OUTPUT"

      - run: bun install --frozen-lockfile

      - run: bunx tsc --project tsconfig.types.json --noEmit
        working-directory: \${{ steps.pkg.outputs.dir }}

      - run: bun test
        working-directory: \${{ steps.pkg.outputs.dir }}

      - run: bun run build
        working-directory: \${{ steps.pkg.outputs.dir }}

      - run: npm install -g npm@latest

      - run: npm publish
        working-directory: \${{ steps.pkg.outputs.dir }}
`;

export const writePublishGithubMonoWorkflow = async ({
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
    "тег ожидается в формате <package-name>@vX.Y.Z, пакет ищется в packages/<package-name>",
  );
  console.log(
    "не забудьте настроить Trusted Publisher для каждого паблишащегося пакета на npmjs.com под этот workflow",
  );
};
