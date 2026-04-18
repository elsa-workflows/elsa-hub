
## Generate Markdown File for Get Started Guides

Create a single combined markdown file consolidating the three setup guides (Elsa Server, Elsa Studio, Elsa Server + Studio) for offline reading or reuse.

### Output

File: `/mnt/documents/elsa-getting-started.md`

### Structure

```text
# Getting Started with Elsa Workflows

## 1. Elsa Server
   - Overview, Prerequisites
   - Steps 1-4 (create project, packages, Program.cs, run)
   - Next steps / links

## 2. Elsa Studio
   - Overview, Prerequisites, "Server Required" note
   - Steps 1-8 (project, packages, remove defaults, Program.cs,
     Razor components, appsettings, index.html, run)
   - Next steps / links

## 3. Elsa Server + Studio (Recommended)
   - Overview, Prerequisites, Architecture overview
   - Steps 1-8 (solution, Host project + packages, Host Program.cs,
     appsettings, _Host.cshtml, Client project + packages,
     client config, link & run)
   - Next steps / links
```

### Formatting

- Each guide as a top-level `##` section, steps as `###` headings
- All shell, C#, Razor, JSON, and HTML snippets in fenced code blocks with proper language tags (`bash`, `csharp`, `razor`, `json`, `html`)
- File-name banners (e.g. `Program.cs`, `wwwroot/appsettings.json`) preserved as a line above each code block
- Default credentials, prerequisites, and notes preserved as callout-style blockquotes
- Links to docs.elsaworkflows.io and the elsa-samples repo retained

### Delivery

After generation, emit a `presentation-artifact` tag pointing to `elsa-getting-started.md` (mime `text/markdown`) so you can download it.
