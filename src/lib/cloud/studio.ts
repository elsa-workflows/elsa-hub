export async function createCloudPkcePair() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const verifier = base64Url(bytes);
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return { verifier, challenge: base64Url(new Uint8Array(digest)) };
}

export function submitStudioHandoff(handoff: {
  token: string;
  tokenType: string;
  redirectUri: string;
}, verifier: string) {
  const form = document.createElement("form");
  form.method = "POST";
  form.action = handoff.redirectUri;
  form.target = "_blank";
  form.rel = "noopener noreferrer";
  for (const [name, value] of [
    ["token", handoff.token],
    ["token_type", handoff.tokenType],
    ["code_verifier", verifier],
  ]) {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = name;
    input.value = value;
    form.appendChild(input);
  }
  document.body.appendChild(form);
  form.submit();
  form.remove();
}

function base64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
