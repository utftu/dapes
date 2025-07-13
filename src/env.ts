import type { Envs } from "./types.ts";

const readEnvContent = (text: string) => {
  const lines = text.split("\n");

  const envs: Envs = {};
  for (const line of lines) {
    const trimmedLine = line.trim();

    if (trimmedLine.startsWith("#")) {
      continue;
    }

    if (trimmedLine === "") {
      continue;
    }

    const splitted = trimmedLine.split("=");

    const name = splitted[0]!;
    const value = splitted.slice(1).join("=");

    let preparedValue;

    if (value.startsWith('"') && value.endsWith('"')) {
      preparedValue = value.slice(1, -1);
    } else {
      preparedValue = value;
    }

    envs[name] = preparedValue;
  }

  return envs;
};

export const readEnvFile = async (filePath: string) => {
  const fileText = await Bun.file(filePath).text();
  return readEnvContent(fileText);
};

export const readEnvFileMerged = async (filePath: string) => {
  const env = await readEnvFile(filePath);
  return { ...process.env, ...env };
};
