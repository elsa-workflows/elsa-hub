import { handleCloudBff } from "./handler.ts";

Deno.serve((req) => handleCloudBff(req));
