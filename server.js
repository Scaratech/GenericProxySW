import { epoxyPath } from "@mercuryworkshop/epoxy-transport";
import { baremuxPath } from "@mercuryworkshop/bare-mux/node";
import wisp from "wisp-server-node";
import { createServer } from "http";
import express from "express";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const app = express();

app.use(express.static(join(fileURLToPath(new URL(".", import.meta.url)), "./public")));
app.use("/dist/", express.static(join(fileURLToPath(new URL(".", import.meta.url)), "./dist")));
app.use("/baremux/", express.static(baremuxPath));
app.use("/epoxy/", express.static(epoxyPath));


const server = createServer(app);

server.on("upgrade", (req, socket, head) => {
	wisp.routeRequest(req, socket, head);
});

const port = 7000;

server.listen(port, () => {
	console.log(`Server listening on port: ${port}`);
});