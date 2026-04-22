
## Update Elsa Server Guide for 3.6.0 Package Renames

Apply the package and namespace renames from elsa-gitbook PR #152 (matching Elsa 3.6.0) to `src/pages/get-started/ElsaServer.tsx`.

### Changes to `ElsaServer.tsx`

**1. Update the `packages` snippet (Step 2 — `dotnet add package …`)**

Old → New:
- `Elsa.EntityFrameworkCore` → `Elsa.Persistence.EFCore`
- `Elsa.EntityFrameworkCore.Sqlite` → `Elsa.Persistence.EFCore.Sqlite`
- `Elsa.CSharp` → `Elsa.Expressions.CSharp`
- `Elsa.JavaScript` → `Elsa.Expressions.JavaScript`
- `Elsa.Liquid` → `Elsa.Expressions.Liquid`
- Add `Elsa.Http` (included in the upstream guide alongside Identity / Scheduling / Workflows.Api)

Final list (preserving original ordering, with renamed names):
```
dotnet add package Elsa
dotnet add package Elsa.Persistence.EFCore
dotnet add package Elsa.Persistence.EFCore.Sqlite
dotnet add package Elsa.Http
dotnet add package Elsa.Identity
dotnet add package Elsa.Scheduling
dotnet add package Elsa.Workflows.Api
dotnet add package Elsa.Expressions.CSharp
dotnet add package Elsa.Expressions.JavaScript
dotnet add package Elsa.Expressions.Liquid
```

**2. Update the `programCs` snippet (Step 3) — `using` directives only**

- `using Elsa.EntityFrameworkCore.Extensions;` → `using Elsa.Persistence.EFCore.Extensions;`
- `using Elsa.EntityFrameworkCore.Modules.Management;` → `using Elsa.Persistence.EFCore.Modules.Management;`
- `using Elsa.EntityFrameworkCore.Modules.Runtime;` → `using Elsa.Persistence.EFCore.Modules.Runtime;`

The body of `Program.cs` (the `elsa.UseWorkflowManagement(...)`, `elsa.UseCSharp()`, `elsa.UseJavaScript()`, `elsa.UseLiquid()` calls, etc.) stays unchanged — only the namespaces and package names changed in 3.6.0; the extension-method names in those modules remain the same.

### Out of scope

- `ElsaStudio.tsx` and `ElsaServerAndStudio.tsx` (separate guides — can be addressed in a follow-up if you want them aligned to 3.6.0 as well).
- The downloadable markdown artifact in `/mnt/documents/elsa-getting-started.md` (already generated; mention it will be regenerated only if you ask).

### Memory update

Refresh `mem://resources/get-started-version-anchor` to reflect the 3.6.0 package naming (Persistence.EFCore + Expressions.* prefixes) so future guides stay consistent.
