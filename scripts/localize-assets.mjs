import { readFile, writeFile } from "node:fs/promises";
for (const file of ["lib/data.ts", "app/page.tsx", "app/feedback/page.tsx"]) {
  const source = await readFile(file, "utf8");
  await writeFile(
    file,
    source.replace(
      /https:\/\/images\.pexels\.com\/photos\/(\d+)\/[^'"\s]+/g,
      (_, id) => `/images/${id}.jpg`,
    ),
  );
}
