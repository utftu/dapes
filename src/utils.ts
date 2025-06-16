export const getAbsolutePath = (relative: string, meta: ImportMeta) => {
  const url = new URL(meta.resolve(relative));

  return url.pathname;
};
