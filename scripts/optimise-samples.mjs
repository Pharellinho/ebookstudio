import { readdir, stat, unlink } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const dir = path.join(process.cwd(), "public", "samples");
const files = (await readdir(dir)).filter((file) => file.endsWith(".png"));

for (const file of files) {
  const source = path.join(dir, file);
  const target = source.replace(/\.png$/, ".webp");

  await sharp(source)
    .resize({ width: 1000, withoutEnlargement: true })
    .webp({ quality: 82 })
    .toFile(target);

  const before = (await stat(source)).size;
  const after = (await stat(target)).size;
  await unlink(source);

  console.log(
    `${file} → ${path.basename(target)}  ${(before / 1024 / 1024).toFixed(2)}MB → ${(after / 1024).toFixed(0)}KB`,
  );
}
