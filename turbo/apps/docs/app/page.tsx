import fs from "node:fs/promises";
import path from "node:path";
import Link from "next/link";

async function listDocs(dir: string, base = ""): Promise<Array<{ name: string; slug: string }>> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const results: Array<{ name: string; slug: string }> = [];

  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const nested = await listDocs(fullPath, path.join(base, entry.name));
      results.push(...nested);
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      results.push({
        name: path.join(base, entry.name),
        slug: path.join(base, entry.name.replace(/\.md$/, "")),
      });
    }
  }

  return results;
}

export default async function Page() {
  const docsRoot = path.resolve(process.cwd(), "..", "..", "docs");
  const docs = await listDocs(docsRoot);

  return (
    <main>
      <h1>Mimo Docs</h1>
      <nav>
        <ul>
          {docs.map((doc) => (
            <li key={doc.slug}>
              <Link href={`/docs/${doc.slug}`}>{doc.name}</Link>
            </li>
          ))}
        </ul>
      </nav>
    </main>
  );
}
