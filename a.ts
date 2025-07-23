import { join } from "node:path";

export const getAbsolutePath = (relative: string, meta: ImportMeta) => {
  const absolutePath = join(meta.dir, relative);

  return absolutePath;
};
