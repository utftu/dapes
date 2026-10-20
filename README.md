# dapes

A task runner and release tool for [Bun](https://bun.sh) projects.

dapes lets you describe a project's tasks in plain TypeScript instead of `package.json` scripts or a Makefile. Tasks can depend on each other, return values to each other and run shell commands with prefixed, colored output. dapes also comes with a CLI that bumps the version, tags, pushes and publishes to npm. It works for single packages and for monorepos.

Maintainer: Aleksey Malyuta ([@utftu](https://github.com/utftu))

## Contents

- [Features](#features)
- [Requirements](#requirements)
- [Installation](#installation)
- [Quick start](#quick-start)
- [Tasks](#tasks)
- [Groups and subgroups](#groups-and-subgroups)
- [Running tasks from the command line](#running-tasks-from-the-command-line)
- [Running commands](#running-commands)
- [Environment files](#environment-files)
- [Release CLI](#release-cli)
- [Monorepos](#monorepos)
- [Publishing from GitHub Actions](#publishing-from-github-actions)
- [API reference](#api-reference)
- [Security](#security)
- [License](#license)

## Features

- **Tasks in TypeScript.** A task is an object with an `exec` function. You get type checking, imports and any library you like.
- **Dependencies.** Tasks run their `parents` before them and their `children` after them. Each task runs at most once per invocation, even if several tasks depend on it.
- **Background tasks.** A dependency can run without being awaited, for example a dev server that starts next to a watcher.
- **Readable output.** Every line a command prints is prefixed with the task name, in a color of its own.
- **Groups.** Tasks are organized into groups. Groups nest, so each package in a monorepo can have its own group.
- **Release commands.** One command bumps the version, commits, tags, pushes to every git remote and publishes to npm.
- **GitHub Actions.** One command writes a workflow that publishes to npm through Trusted Publishing when a tag is pushed.

## Requirements

- [Bun](https://bun.sh). dapes uses Bun APIs (`Bun.spawn`, `Bun.file`) and does not run on Node.js.
- `bash`. Commands run through `bash -c`.
- `git` and `npm`, for the release commands.

## Installation

```sh
bun add -d dapes
```

The `dapes` binary for the release CLI is installed with the package:

```sh
bunx dapes release
```

## Quick start

Create `dapes.run.ts` in the project root:

```ts
import { Group, Task, startIfMain } from "dapes";

const clean = new Task({
  name: "clean",
  description: "Remove build output",
  exec: async ({ command }) => {
    await command("rm -rf dist");
  },
});

const build = new Task({
  name: "build",
  description: "Build the project",
  parents: [clean],
  exec: async ({ command }) => {
    await command("bun build ./src/index.ts --outdir ./dist");
  },
});

const test = new Task({
  name: "test",
  parents: [build],
  exec: async ({ command }) => {
    await command("bun test");
  },
});

const group = new Group({
  tasks: [build, clean, test],
});

await startIfMain(group, import.meta);
```

Run it:

```sh
bun dapes.run.ts test
```

```text
clean: rm -rf dist
build: bun build ./src/index.ts --outdir ./dist
build: Bundled 3 modules in 4ms
test: bun test
test: 12 pass
```

## Tasks

```ts
const task = new Task({
  name: "build",          // name used on the command line
  description: "...",     // optional
  parents: [],            // tasks to run before this one
  children: [],           // tasks to run after this one
  beforeExec: (ctx) => {},// optional, runs before the parents
  exec: async (ctx) => {},// the task itself
  optionalArgs: false,    // accept extra command-line arguments
});
```

### Order of execution

When a task runs:

1. `beforeExec` runs, if there is one.
2. The `parents` run one after another, in the order they are listed.
3. `exec` runs.
4. The `children` run one after another.

A task runs at most once per invocation. If two tasks list the same parent, it runs once, and the second task gets the result of the first run.

### Results

`exec` can return a value. Tasks that list it as a parent see it in `parentResults`:

```ts
const version = new Task({
  name: "version",
  exec: async ({ command }) => {
    const { stdout } = await command("git describe --tags");
    return stdout.trim();
  },
});

const build = new Task({
  name: "build",
  parents: [version],
  exec: async ({ parentResults, command }) => {
    const [{ result: tag }] = parentResults;
    await command(`bun build ./src/index.ts --outdir ./dist --define VERSION='"${tag}"'`);
  },
});
```

### Background dependencies

By default every parent is awaited. To start a parent and move on without waiting for it, pass a `TaskControl` with `needAwait: false`:

```ts
const server = new Task({
  name: "server",
  exec: async ({ command }) => {
    await command("bun --watch ./src/server.ts");
  },
});

const dev = new Task({
  name: "dev",
  parents: [{ task: server, needAwait: false }],
  exec: async ({ command }) => {
    await command("bun build ./src/client.ts --outdir ./dist --watch");
  },
});
```

`bun dapes.run.ts dev` starts the server and the client build side by side. Both write to the same terminal, each with its own prefix.

### Errors

If a command exits with a non-zero code, `command` throws an error, the task fails and the tasks after it do not run. If a command is interrupted with `SIGINT`, `SIGTERM` or `SIGKILL`, dapes exits with the same code.

## Groups and subgroups

A `Group` collects tasks under a name. Groups can contain other groups:

```ts
// packages/web/dapes.run.ts
import { Group, Task, startIfMain } from "dapes";

const dev = new Task({
  name: "dev",
  exec: async ({ command }) => {
    await command("bun --hot ./src/index.ts", { cwd: "packages/web" });
  },
});

export const web = new Group({
  name: "web",
  tasks: [dev],
});

await startIfMain(web, import.meta);
```

```ts
// dapes.run.ts
import { Group, Task, startIfMain } from "dapes";
import { web } from "./packages/web/dapes.run.ts";

const dev = new Task({
  name: "dev",
  parents: [web.getTaskControl("dev")],
  exec: async ({ command }) => {
    await command("bun run ./src/api.ts");
  },
});

const root = new Group({
  tasks: [dev],
  subgroups: [web],
});

await startIfMain(root, import.meta);
```

`group.getTaskControl(name)` returns a dependency on a task of that group. In the output, the task's prefix includes the group name (`web:dev:`).

`startIfMain` runs the group only when the file is the entry point. That means `packages/web/dapes.run.ts` can be imported by the root file and also run on its own.

## Running tasks from the command line

```sh
bun dapes.run.ts                 # first task of the root group
bun dapes.run.ts build           # the "build" task, with its parents and children
bun dapes.run.ts build only      # only "build", without parents and children
bun dapes.run.ts web             # first task of the "web" subgroup
bun dapes.run.ts web dev         # the "dev" task of the "web" subgroup
```

### Passing arguments to a task

With `optionalArgs: true`, a task accepts one extra argument and receives it in `args`:

```ts
const migrate = new Task({
  name: "migrate",
  optionalArgs: true,
  exec: async ({ command, args }) => {
    await command(`bunx drizzle-kit migrate ${args}`);
  },
});
```

```sh
bun dapes.run.ts migrate --verbose
```

Tip: add a script to `package.json` so you can write `bun d build`:

```json
{
  "scripts": {
    "d": "bun dapes.run.ts"
  }
}
```

## Running commands

The context passed to `exec` and `beforeExec` has two ways to run shell commands.

### `command(cmd, { env, cwd })`

- Prints the command, then streams its stdout and stderr line by line, each line prefixed with the task name.
- Returns `{ stdout, stderr }` as strings once the command finishes.
- Throws if the exit code is not zero.
- Sets `FORCE_COLOR=1`, so tools keep their colors when piped.

```ts
const { stdout } = await command("git rev-parse HEAD");
```

### `commandNative(cmd, { env, cwd })`

Runs the command with the terminal attached directly (inherited stdio). Use it for interactive tools and tools that redraw the screen, such as prompts, progress bars and `npm publish` with 2FA. The output is not prefixed and not captured.

```ts
await commandNative("bunx drizzle-kit studio");
```

### `env`

If you pass `env`, it **replaces** the environment of the command, so `PATH` and other variables are not inherited. To add variables, merge them with `process.env`, or use `readEnvFileMerged`:

```ts
await command("bun run ./src/server.ts", {
  env: { ...process.env, PORT: "3000" },
});
```

## Environment files

```ts
import { readEnvFile, readEnvFileMerged } from "dapes";

// Only the variables from the file
const vars = await readEnvFile(".env");

// process.env plus the variables from the file (the file wins)
const env = await readEnvFileMerged(".env.local");
await command("bun run start", { env });
```

The parser supports `KEY=value` lines, `#` comments, empty lines and values wrapped in double quotes.

To resolve a path relative to the current file instead of the working directory, use `getAbsolutePath`:

```ts
import { getAbsolutePath, readEnvFileMerged } from "dapes";

const env = await readEnvFileMerged(getAbsolutePath(".env", import.meta));
```

## Release CLI

All commands bump the **patch** version and push the commit and the tag to **every** git remote.

| Command | What it does |
| --- | --- |
| `dapes release` | Bump the version in `package.json`, commit, tag `vX.Y.Z`, push |
| `dapes publish` | Commit pending changes, run `build`, bump the version, commit, tag `vX.Y.Z`, push, `npm publish` |
| `dapes publish_re` | Delete the tag of the current version locally and on the remotes, tag again, push, `npm publish`. Use it when a publish failed half-way |
| `dapes release_mono <package>` | Same as `release` for `packages/<package>`. The tag is `<name>@vX.Y.Z` |
| `dapes release_mono_re <package>` | Delete the tag of the current version of `packages/<package>`, tag again, push |
| `dapes publish_mono <package>` | Same as `publish` for `packages/<package>` |
| `dapes publish_mono_re <package>` | Same as `publish_re` for `packages/<package>` |
| `dapes publish_github` | Write `.github/workflows/publish.yml` for a single package |
| `dapes publish_github_mono` | Write `.github/workflows/publish.yml` for a monorepo |

### Typical flows

Publish from your machine:

```sh
bunx dapes publish
```

Publish from CI: write the workflow once, then release by pushing a tag:

```sh
bunx dapes publish_github
bunx dapes release
```

### From code

The same commands are available as functions, so you can make them part of your own tasks:

```ts
import { Group, Task, publishPackage, startIfMain } from "dapes";

const test = new Task({
  name: "test",
  exec: async ({ command }) => {
    await command("bun test");
  },
});

const publish = new Task({
  name: "publish",
  parents: [test],
  exec: async ({ ctx }) => {
    await publishPackage({ version: "minor", ctx });
  },
});

await startIfMain(new Group({ tasks: [publish, test] }), import.meta);
```

Passing `ctx` makes the commands appear under the task's prefix. The functions accept `version: "major" | "minor" | "patch"` (default `"patch"`) and `pathToPackage` (default `"package.json"`).

## Monorepos

The `*_mono` commands expect this layout:

```text
.
├── package.json
└── packages/
    ├── core/
    │   └── package.json   ("name": "core")
    └── cli/
        └── package.json   ("name": "cli")
```

`<package>` is the folder name in `packages/`. The tag is made from the `name` field of the package's `package.json`:

```sh
bunx dapes release_mono core     # commits and tags core@v0.1.4
```

Each package has its own version and its own tags.

## Publishing from GitHub Actions

`dapes publish_github` and `dapes publish_github_mono` write a workflow that:

1. Runs when a tag is pushed: `v*.*.*`, or `*@v*.*.*` for monorepos.
2. Installs the dependencies with Bun, type checks, runs the tests and builds.
3. Publishes to npm with [Trusted Publishing](https://docs.npmjs.com/trusted-publishers) (OIDC), so you don't need an `NPM_TOKEN` secret.

In the monorepo workflow, the package folder is taken from the tag: `core@v0.1.4` publishes `packages/core`.

After you write the workflow, add it as a Trusted Publisher in the package settings on npmjs.com. In a monorepo, do this for every package.

## API reference

### `new Task(options)`

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `name` | `string` | (required) | Name on the command line and in the output prefix |
| `exec` | `(ctx) => T \| Promise<T>` | (required) | The task. Its return value goes to the tasks that depend on it |
| `parents` | `(Task \| TaskControl)[]` | `[]` | Run before `exec` |
| `children` | `(Task \| TaskControl)[]` | `[]` | Run after `exec` |
| `beforeExec` | `(ctx) => void \| Promise<void>` | | Runs before the parents |
| `description` | `string` | `""` | Shown in help |
| `optionalArgs` | `boolean` | `false` | Accept one extra command-line argument |

Methods: `run()`, `cancel()` (stops the task and its parents and kills their running commands).

### `TaskControl`

```ts
type TaskControl = {
  task: Task;
  needAwait: boolean; // false: start the task, don't wait for it
  group?: Group;      // used for the output prefix
};
```

### Exec context

| Field | Description |
| --- | --- |
| `command(cmd, { env?, cwd? })` | Run a command with prefixed output. Returns `{ stdout, stderr }` |
| `commandNative(cmd, { env?, cwd? })` | Run a command with the terminal attached |
| `parentResults` | `{ task, result }[]`, in the order of `parents` |
| `args` | The extra argument, when `optionalArgs` is `true` |
| `prefix` | The colored prefix of this task |
| `task` | The running `Task` |
| `ctx` | The context itself, to pass on to `publishPackage` and similar functions |

### `new Group({ name?, tasks, subgroups? })`

- `getTaskControl(name)` returns a `TaskControl` for a task of the group. Throws if there is no task with that name.

### Functions

| Function | Description |
| --- | --- |
| `start(group)` | Parse `process.argv` and run the selected task |
| `startIfMain(group, import.meta)` | Same, but only when the file is the entry point |
| `readEnvFile(path)` | Parse an env file |
| `readEnvFileMerged(path)` | `process.env` merged with the env file |
| `getAbsolutePath(relative, import.meta)` | Resolve a path relative to the current file |
| `releasePackage(options)` | See `dapes release` |
| `publishPackage(options)` | See `dapes publish` |
| `releasePackageMono(options)` | See `dapes release_mono` |
| `releasePackageMonoRetry(options)` | See `dapes release_mono_re` |
| `publishPackageMono(options)` | See `dapes publish_mono` |

## Security

To report a vulnerability, see [SECURITY.md](SECURITY.md).

## License

[MIT](LICENSE) © Aleksey Malyuta
