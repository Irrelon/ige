# Shape Factory

This is a multiplayer simulation, making use of networking functionality
built into the game engine.

A little city simulation. The mining buildings will output resources and
the transporter workers that sit on the roads will pick up the resources
and move them to the next node along their transport path to their target
destination. The simulation is similar in nature to "The Settlers 2".

Once you place a building, click on it to start building a road then click
on the destination building to finish building a road.

This example shows how the IgeRouter `ige.router` can be used to navigate
around a game's screens and levels, as well as networking, NPC task
management and rendering with `IgeSmartTexture` scripts.

> This game's server will run on port 2000 by default.

To run the server, execute the command:

```bash
node ./index.js
```

You can run the client by opening index.html from your IDE's built in webserver
or by hosting it on a webserver locally.
