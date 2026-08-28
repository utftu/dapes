import { promises as fs } from "node:fs";
import { join } from "node:path";
import crypto from "node:crypto";

const defaultExts = [".ts", ".tsx", "package.json"];

const createHash = (str: string) => {
  const hash = crypto.createHash("sha256").update(str).digest("hex");

  return hash;
};

const checkExt = (name: string, exts: string[]) => {
  for (const ext of exts) {
    if (name.endsWith(ext)) {
      return true;
    }
  }
  return false;
};

async function getDirHash({
  dir,
  exts,
}: {
  dir: string;
  exts: string[];
}): Promise<string> {
  const hashes: string[] = [];

  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const path = join(dir, entry.name);
    const stats = await fs.stat(path);

    if (entry.isDirectory()) {
      const subHash = await getDirHash({ dir: path, exts });
      const dirHash = createHash(`${path}:${subHash}`);
      hashes.push(dirHash);
    } else {
      if (!checkExt(path, exts)) {
        continue;
      }
      const str = `${path}:${stats.size}:${stats.mtimeMs}`;
      const hash = crypto.createHash("sha256").update(str).digest("hex");
      hashes.push(hash);
    }
  }

  const str = hashes.sort().join("\n");
  return createHash(str);
}

export async function checkDirChanged({
  dir,
  cacheFile,
  exts = defaultExts,
}: {
  dir: string;
  cacheFile: string;
  exts: string[];
}): Promise<boolean> {
  const curr = await getDirHash({ dir, exts });
  let prev = "";

  try {
    prev = (await fs.readFile(cacheFile, "utf8")).trim();
  } catch {
    // файла может не быть — это нормально
  }

  const changed = curr !== prev;

  if (changed) {
    console.log("📦 Изменения найдены, обновляю хеш...");
    await fs.writeFile(cacheFile, curr);
  } else {
    console.log("✅ Без изменений");
  }

  return changed;
}
