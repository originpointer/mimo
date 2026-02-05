import fs from "node:fs/promises";
import path from "node:path";
import ReactMarkdown from "react-markdown";

export default async function DocPage({ params }: { params: { slug?: string[] } }) {
  const slug = params.slug ?? [];
  const docsRoot = path.resolve(process.cwd(), "..", "..", "docs");
  const filePath = path.join(docsRoot, ...slug) + ".md";
  const content = await fs.readFile(filePath, "utf-8");

  return (
    <main>
      <ReactMarkdown>{content}</ReactMarkdown>
    </main>
  );
}
