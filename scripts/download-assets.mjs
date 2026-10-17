import { readFile, writeFile, mkdir, stat } from "node:fs/promises";
const files = ["lib/data.ts", "app/page.tsx", "app/feedback/page.tsx"];
const sources = new Map(
  Object.entries(
    JSON.parse(
      await readFile("public/images/sources.json", "utf8").catch(() => "{}"),
    ),
  ),
);
for (const file of files) {
  const source = await readFile(file, "utf8");
  for (const match of source.matchAll(
    /https:\/\/images\.pexels\.com\/photos\/(\d+)\/[^'"\s]+/g,
  )) {
    sources.set(match[1], match[0]);
  }
}
await mkdir("public/images", { recursive: true });
const fallbacks = {
  27590337: "1351238",
  36850059: "675951",
  29530032: "291528",
  18229217: "5409010",
};
const failed = [];
for (const [id, original] of sources) {
  if (await stat(`public/images/${id}.jpg`).catch(() => null)) continue;
  let url = original;
  let response = await fetch(url);
  if (!response.ok && fallbacks[id]) {
    url = `https://images.pexels.com/photos/${fallbacks[id]}/pexels-photo-${fallbacks[id]}.jpeg?auto=compress&cs=tinysrgb&w=600`;
    response = await fetch(url);
  }
  if (!response.ok) {
    failed.push(`${id}: HTTP ${response.status}`);
    continue;
  }
  sources.set(id, url);
  const bytes = Buffer.from(await response.arrayBuffer());
  await writeFile(`public/images/${id}.jpg`, bytes);
  console.log(`Saved photograph ${id} (${Math.round(bytes.length / 1024)} KB)`);
}
await writeFile(
  "public/images/sources.json",
  JSON.stringify(Object.fromEntries(sources), null, 2) + "\n",
);
if (failed.length) throw Error(failed.join("\n"));
