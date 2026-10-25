import { COMMUNITY_RUNTIME_IMAGE_TAGS, PAID_RUNTIME_IMAGE_TAGS, type RuntimeImageTagRow } from "@/data/dockerImages";

function TagTable({ rows }: { rows: RuntimeImageTagRow[] }) {
  return (
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
          {rows.map((t) => (
            <tr key={t.pattern} className="border-t">
              <td className="px-4 py-2 font-mono text-xs">{t.pattern}</td>
              <td className="px-4 py-2 font-mono text-xs">{t.example}</td>
              <td className="px-4 py-2 text-muted-foreground">{t.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ImageTagsTable() {
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h2 className="text-3xl font-bold">Image tags</h2>
        <p className="text-muted-foreground">
          Community images on GitHub Container Registry publish <code className="font-mono text-xs">latest</code> and
          the Elsa version. Paid images on Azure Container Registry also publish a commit SHA and an immutable
          build tag.
        </p>
      </div>
      <div className="space-y-3">
        <h3 className="text-lg font-semibold">Community GHCR</h3>
        <p className="text-sm text-muted-foreground">
          <code className="font-mono text-xs">ghcr.io/valence-works/runtime-ce-{"{server,studio,combined}"}</code>
        </p>
        <TagTable rows={COMMUNITY_RUNTIME_IMAGE_TAGS} />
      </div>
      <div className="space-y-3">
        <h3 className="text-lg font-semibold">Paid ACR</h3>
        <p className="text-sm text-muted-foreground">
          <code className="font-mono text-xs">valenceruntimeimages.azurecr.io/runtime-{"{server,studio,combined}"}</code>
        </p>
        <TagTable rows={PAID_RUNTIME_IMAGE_TAGS} />
      </div>
    </div>
  );
}
