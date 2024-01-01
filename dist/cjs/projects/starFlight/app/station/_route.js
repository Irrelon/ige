"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const instance_1 = require("@/engine/instance");
instance_1.ige.router.route("app.space", {
    client: {
        controller: "StationClient",
        sceneGraph: "StationClientScene",
        textures: "StationClientTextures"
    },
    server: {
        controller: "StationServer",
        sceneGraph: "StationServerScene"
    }
});
