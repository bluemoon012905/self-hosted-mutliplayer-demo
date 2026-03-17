import { createServer } from "node:http";

import { buildGameCatalog } from "../shared/factories/gameCatalogFactory";

const port = Number(process.env.PORT ?? 3001);

const server = createServer((request, response) => {
  if (request.url === "/health") {
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({ ok: true, mode: "local-server" }));
    return;
  }

  if (request.url === "/catalog") {
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify(buildGameCatalog()));
    return;
  }

  response.writeHead(404, { "content-type": "application/json" });
  response.end(JSON.stringify({ error: "Not found" }));
});

server.listen(port, () => {
  console.log(`Local server running at http://localhost:${port}`);
});
