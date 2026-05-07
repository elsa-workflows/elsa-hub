const tags: Array<{ pattern: string; example: string; description: string }> = [
  { pattern: "latest", example: "latest", description: "Most recent build from main — always moving" },
  { pattern: "<version>-preview.<build>", example: "1.0.0-preview.42", description: "Preview build from main, auto-increments per push" },
  { pattern: "<version>", example: "1.0.0", description: "Stable release (from a git tag)" },
  { pattern: "<major>.<minor>", example: "1.0", description: "Latest patch within a minor version" },
  { pattern: "<major>", example: "1", description: "Latest minor+patch within a major version" },
  { pattern: "elsa-<elsa-version>", example: "elsa-3.8.0-preview.4538", description: "Latest build targeting a specific Elsa version" },
  { pattern: "sha-<commit>", example: "sha-07169a7", description: "Pinned to an exact commit" },
];

export function ImageTagsTable() {
  return (
    <div className="space-y-4">
      <h2 className="text-3xl font-bold">Image tags</h2>
      <p className="text-muted-foreground">
        Each image is published with multiple tags so you can pin to the level of stability you need.
      </p>
      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-4 py-2 font-medium">Tag pattern</th>
              <th className="text-left px-4 py-2 font-medium">Example</th>
              <th className="text-left px-4 py-2 font-medium">Description</th>
            </tr>
          </thead>
          <tbody>
            {tags.map((t) => (
              <tr key={t.pattern} className="border-t">
                <td className="px-4 py-2 font-mono text-xs">{t.pattern}</td>
                <td className="px-4 py-2 font-mono text-xs">{t.example}</td>
                <td className="px-4 py-2 text-muted-foreground">{t.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
