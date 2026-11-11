// node --experimental-transform-types --import ./src/examples/zones/server/register.mjs <script.ts>
import { register } from "node:module";

register("./hooks.mjs", import.meta.url);
