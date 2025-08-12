import { join } from "node:path";

export const getAbsolutePath = (relative: string, meta: ImportMeta) => {
  const absolutePath = join(meta.dir, relative);

  return absolutePath;
};

console.log("1", getAbsolutePath("./src/color.ts", import.meta));

export const getAbsolutePath2 = (relative: string, meta: ImportMeta) => {
  return new URL(relative, meta.url).pathname;
};

console.log("2", getAbsolutePath2("./src/color.t", import.meta));
