# Multiplayer Example
This example uses the network stream to keep all clients in sync with the server-side simulation. When a client
connects to the server it requests that a new player entity is created for it by sending the network command
"playerEntity". The server receives this command, sets up the new player entity and then sends the network command
"playerEntity" back to the client with the ID of the entity it just created.

The client receives the "playerEntity" network command and then tells it's main camera to track the translation of the
new entity.

The client controls are UP, DOWN, LEFT and RIGHT. When control states of each key change the change is sent to the server
so for instance, when the LEFT key is pressed down, the network command "playerControlsLeftDown" is sent. When the LEFT
key is released the network command "playerControlsLeftUp" is sent.

Each tick in the Player class on the server it checks the current state of the controls that are set by the
playerControls* network commands. When a control is pressed the entity is altered.

The server streams all the simulation updates to the connected clients and that is how this example works.

Players can only move around. There is no "game" with this example, it exists to show you how to successfully create
a multiplayer environment with each player controlling their entity and synchronising the simulation to all clients.

The engine knows which entities to synchronise because a call to the entity's streamMode() method is made in the
Player class (./gameClasses/Player.js). The streamMode() method accepts a mode integer which tells the engine how
to handle streaming the entity's updates to connected clients. In this example we do:

    entity.streamMode(1);

This tells the engine to stream all data automatically - in other words whenever the entity's transform data (position,
rotation, scale etc) is updated all clients are informed. The engine supports much more advanced ways to deal with
streaming data to clients but this is the simplest way to handle it. A single method call is all that is required
to get the server-side simulation to send sync data to clients :)

You can find out much more about the network stream system here: http://www.isogenicengine.com/documentation/isogenic-game-engine/versions/1-1-0/manual/networking-multiplayer/realtime-network-streaming/