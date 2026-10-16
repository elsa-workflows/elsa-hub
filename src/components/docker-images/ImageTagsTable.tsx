const tags: Array<{ pattern: string; example: string; description: string }> = [
  {
    pattern: "X.Y.Z",
    example: "3.9.0",
    description: "Pinned stable release. Every stable publish pushes this exact tag. Prefer this in copy-paste snippets.",
  },
  {
    pattern: "X.Y",
    example: "3.9",
    description: "Floating minor. Moves when a stable X.Y.Z is the highest patch on that line.",
  },
  {
    pattern: "latest",
    example: "latest",
    description: "Moves when a stable X.Y.Z is the highest stable 3.x release.",
  },
  {
    pattern: "X.Y.Z-preview.N",
    example: "3.9.0-preview.1",
    description: "Preview builds only. Previews never move X.Y or latest.",
  },
];

export function ImageTagsTable() {
  return (
    <div className="space-y-4">
      <h2 className="text-3xl font-bold">Image tags</h2>
      <p className="text-muted-foreground">
        Elsa Community images on Docker Hub (<code className="font-mono text-sm">elsaworkflows/elsa-*-v3</code>)
        use this policy. Every stable release pushes <code className="font-mono text-sm">X.Y.Z</code>, moves{" "}
        <code className="font-mono text-sm">X.Y</code>, and moves <code className="font-mono text-sm">latest</code>{" "}
        when it is the highest version. Previews only get <code className="font-mono text-sm">X.Y.Z-preview.N</code>.
        linux/amd64 and linux/arm64.
      </p>
      <p className="text-sm text-muted-foreground">
        This does not apply to the Apps aliases{" "}
        <code className="font-mono text-xs">elsaworkflows/elsa-server</code> and{" "}
        <code className="font-mono text-xs">elsaworkflows/elsa-studio</code>, which are a separate product and
        have not changed.
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
