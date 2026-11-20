import { getDockerImage } from "@/data/dockerImages";

export type QuickstartImage = "combined" | "server" | "studio";
export type QuickstartFormat = "run" | "compose";

export const quickstartChoices: { id: QuickstartImage; label: string; description: string }[] = [
  { id: "combined", label: "Combined", description: "API + Studio in one container. Start here for a first look." },
  { id: "server", label: "Server", description: "Workflow engine and API, without the designer." },
  { id: "studio", label: "Server + Studio", description: "Separate containers for the API and designer." },
];

// Local evaluation examples based on the publisher's Runtime README quickstart.
// Keep production configuration and the full image catalog independent of this first-run flow.
export function getRuntimeQuickstart(image: QuickstartImage, format: QuickstartFormat) {
  const catalogImage = getDockerImage(`runtime-${image}`);
  const combined = image === "combined";
  const separate = image === "studio";
  const serverImage = getDockerImage("runtime-server")?.image ?? "";
  const backendImage = combined ? catalogImage?.image : serverImage;
  const adminUsername = "CShells__Shells__Default__Features__DefaultAdminUser__AdminUsername";
  const adminPassword = "CShells__Shells__Default__Features__DefaultAdminUser__AdminPassword";
  const signingKey = "CShells__Shells__Default__Features__Identity__SigningKey";
  const name = combined ? "elsa-combined" : "elsa-server";

  const run = `${separate ? "docker network create elsa\n\n" : ""}docker run -d --name ${name}${separate ? " --network elsa" : ""} \\\n  -p 127.0.0.1:8080:8080 \\\n  -e ${adminUsername}=admin \\\n  -e ${adminPassword}='ChangeThisPassword123!' \\\n  -e ${signingKey}="$(openssl rand -base64 32)" \\\n${separate ? "  -e Elsa__Cors__AllowedOrigins__0=http://localhost:8081 \\\n" : ""}  ${backendImage}:latest${separate ? `\n\ndocker run -d --name elsa-studio --network elsa \\\n  -p 127.0.0.1:8081:8080 \\\n  -e Studio__HostingModel=WebAssembly \\\n  -e Studio__Client__Backend__Url=http://localhost:8080/elsa/api \\\n  ${catalogImage?.image}:latest` : ""}`;

  const compose = `services:
  ${name}:
    image: ${backendImage}:latest
    ports:
      - "127.0.0.1:8080:8080"
    environment:
      ${adminUsername}: admin
      ${adminPassword}: 'ChangeThisPassword123!'
      ${signingKey}: \${ELSA_SIGNING_KEY:?Set ELSA_SIGNING_KEY before starting}${separate ? `
      Elsa__Cors__AllowedOrigins__0: http://localhost:8081

  elsa-studio:
    image: ${catalogImage?.image}:latest
    ports:
      - "127.0.0.1:8081:8080"
    environment:
      Studio__HostingModel: WebAssembly
      Studio__Client__Backend__Url: http://localhost:8080/elsa/api
    depends_on: [elsa-server]` : ""}`;

  return {
    code: format === "run" ? run : compose,
    startCommand: 'export ELSA_SIGNING_KEY="$(openssl rand -base64 32)"\ndocker compose up -d',
    accessUrl: separate ? "http://localhost:8081" : combined ? "http://localhost:8080" : "http://localhost:8080/health",
    accessLabel: image === "server" ? "Check server readiness" : "Open Studio",
    healthCommand: "curl --fail http://localhost:8080/health",
    cleanupCommand: format === "compose" ? "docker compose down" : `docker rm -f ${name}${separate ? " elsa-studio\ndocker network rm elsa" : ""}`,
  };
}