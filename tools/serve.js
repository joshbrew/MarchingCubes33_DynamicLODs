import { serve } from "tinybuild/tinybuild/node_server/server.js";
import config from "../tinybuild.config.js";

await serve(config.server);
