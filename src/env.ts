import type { Envs } from "./types.ts";

const readEnvContent = (text: string) => {
  const lines = text.split("\n");

  const envs: Envs = {};
  for (const line of lines) {
    const splitted = line.split("=");

    const name = splitted[0]!;
    const value = splitted.slice(1).join("=");

    envs[name] = value;
  }

  return envs;
};

export const readEnv = async (filePath: string) => {
  const fileText = await Bun.file(filePath).text();
  return readEnvContent(fileText);
};
