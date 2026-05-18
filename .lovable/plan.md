Add the missing `rb_selectImage` tool to `buildRuntimeBuilderTools()` in `supabase/functions/weaver-chat/index.ts` so the model can propose image selections that the existing client-side bridge + checklist already know how to handle.

## Change — `supabase/functions/weaver-chat/index.ts`

Inside `buildRuntimeBuilderTools()`, alongside the other `rb_*` tools, add:

```ts
rb_selectImage: tool({
  description:
    "Select the Docker image used at the top of the generated bundle. Slugs come from the curated image catalog: 'elsa-pro-server', 'elsa-pro-studio', 'elsa-pro-combined'. Optionally override tag and host port.",
  inputSchema: z.object({
    slug: z.enum(["elsa-pro-server", "elsa-pro-studio", "elsa-pro-combined"]),
    tag: z.string().min(1).optional(),
    hostPort: z.number().int().min(1).max(65535).optional(),
    reason: z.string().optional(),
  }),
  execute: async (i) => ({ kind: "rb.selectImage", ...i }),
}),
```

Update the system prompt's Runtime Builder paragraph to mention `rb_selectImage` alongside the other `rb_*` actions.

Deploy `weaver-chat` after the edit. No other files change; the intent type, store action, bridge handler, and approval-card checklist are already in place.
