import sources from "@/public/images/sources.json";
export function imageSource(url: string | null | undefined) {
  if (!url) return null;
  const match = url.match(/^https:\/\/images\.pexels\.com\/photos\/(\d+)\//);
  return match && match[1] in sources ? `/images/${match[1]}.jpg` : url;
}
