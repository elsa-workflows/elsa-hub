// Thin client for the public DeepWiki MCP server.
// Streamable HTTP transport, JSON-RPC 2.0. Server is unauthenticated and
// stateless for tools/call, so we don't bother with initialize/session.
//
// Server: https://mcp.deepwiki.com/mcp
// Tools:
//   - read_wiki_structure({ repoName })       -> list of pages
//   - read_wiki_contents({ repoName, page? }) -> page markdown
//   - ask_question({ repoName, question })    -> answer (may include citations)

const MCP_URL = "https://mcp.deepwiki.com/mcp";
const TIMEOUT_MS = 20_000;
const MAX_TEXT = 6000;

export type Repo = "elsa-core" | "elsa-studio" | "elsa-extensions";

export interface DeepWikiAnswer {
  answer: string;
  citations: { title: string; url: string }[];
  repo: Repo;
  fallbackUrl: string;
}

export interface DeepWikiPageList {
  pages: string[];
  repo: Repo;
  fallbackUrl: string;
}

export interface DeepWikiPage {
  page: string;
  content: string;
  repo: Repo;
  fallbackUrl: string;
}

function repoName(repo: Repo) {
  return `elsa-workflows/${repo}`;
}

function fallbackUrl(repo: Repo) {
  return `https://deepwiki.com/elsa-workflows/${repo}`;
}

async function callTool(
  name: string,
  args: Record<string, unknown>,
): Promise<unknown> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(MCP_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // MCP Streamable HTTP requires both content types in Accept.
        Accept: "application/json, text/event-stream",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: crypto.randomUUID(),
        method: "tools/call",
        params: { name, arguments: args },
      }),
      signal: ctrl.signal,
    });
    if (!res.ok) {
      throw new Error(`DeepWiki MCP ${res.status}: ${await res.text()}`);
    }
    const ct = res.headers.get("content-type") ?? "";
    let payload: any;
    if (ct.includes("text/event-stream")) {
      const text = await res.text();
      // Concatenate all `data:` lines from the SSE stream and pick the last
      // JSON-RPC frame (the response).
      const frames: any[] = [];
      for (const line of text.split("\n")) {
        if (line.startsWith("data:")) {
          const raw = line.slice(5).trim();
          if (!raw) continue;
          try {
            frames.push(JSON.parse(raw));
          } catch {
            // ignore non-JSON keepalive frames
          }
        }
      }
      payload = frames.find((f) => f?.result || f?.error) ?? frames.at(-1);
    } else {
      payload = await res.json();
    }
    if (!payload) throw new Error("Empty MCP response");
    if (payload.error) {
      throw new Error(
        `DeepWiki MCP error: ${payload.error.message ?? JSON.stringify(payload.error)}`,
      );
    }
    return payload.result;
  } finally {
    clearTimeout(t);
  }
}

// Flatten MCP `content: [{type:'text', text}, ...]` into a single string.
function extractText(result: unknown): string {
  const r = result as any;
  if (!r) return "";
  if (typeof r === "string") return r;
  if (Array.isArray(r?.content)) {
    return r.content
      .map((p: any) => (typeof p?.text === "string" ? p.text : ""))
      .join("\n")
      .trim();
  }
  return JSON.stringify(r);
}

// Pull markdown-style links out of an answer body so the UI can show them as
// citations. DeepWiki currently embeds source refs as bare URLs and/or
// `[label](url)` links.
function extractCitations(text: string): { title: string; url: string }[] {
  const out: { title: string; url: string }[] = [];
  const seen = new Set<string>();
  const mdLink = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
  let m: RegExpExecArray | null;
  while ((m = mdLink.exec(text))) {
    if (!seen.has(m[2])) {
      seen.add(m[2]);
      out.push({ title: m[1].slice(0, 120), url: m[2] });
    }
  }
  const bare = /(?<![\[\(])\bhttps?:\/\/[^\s)]+/g;
  while ((m = bare.exec(text))) {
    if (!seen.has(m[0])) {
      seen.add(m[0]);
      out.push({ title: m[0].replace(/^https?:\/\//, "").slice(0, 120), url: m[0] });
    }
  }
  return out.slice(0, 6);
}

function truncate(s: string, n = MAX_TEXT) {
  return s.length > n ? s.slice(0, n) + "\n…[truncated]" : s;
}

export async function ask(
  question: string,
  repo: Repo = "elsa-core",
): Promise<DeepWikiAnswer> {
  const result = await callTool("ask_question", {
    repoName: repoName(repo),
    question,
  });
  const text = extractText(result);
  return {
    answer: truncate(text),
    citations: extractCitations(text),
    repo,
    fallbackUrl: fallbackUrl(repo),
  };
}

export async function readStructure(
  repo: Repo = "elsa-core",
): Promise<DeepWikiPageList> {
  const result = await callTool("read_wiki_structure", {
    repoName: repoName(repo),
  });
  const text = extractText(result);
  const pages = text
    .split(/\n+/)
    .map((l) => l.replace(/^[-*\d.\s]+/, "").trim())
    .filter((l) => l.length > 0 && l.length < 200);
  return { pages: pages.slice(0, 80), repo, fallbackUrl: fallbackUrl(repo) };
}

export async function readPage(
  page: string,
  repo: Repo = "elsa-core",
): Promise<DeepWikiPage> {
  const result = await callTool("read_wiki_contents", {
    repoName: repoName(repo),
    page,
  });
  return {
    page,
    content: truncate(extractText(result)),
    repo,
    fallbackUrl: fallbackUrl(repo),
  };
}
