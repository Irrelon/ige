# Multiplayer Example
This example uses the network stream to keep all clients in sync with the server-side simulation. When a client
connects to the server it requests that a new player entity is created for it by sending the network command
"playerEntity". The server receives this command, sets up the new player entity and then sends the network command
"playerEntity" back to the client with the ID of the entity it just created.

The client receives the "playerEntity" network command and then tells it's main camera to track the translation of the
new entity.

The client controls are UP, LEFT and RIGHT. When control states of each key change the change is sent to the server
so for instance, when the LEFT key is pressed down, the network command "playerControlsLeftDown" is sent. When the LEFT
key is released the network command "playerControlsLeftUp" is sent.

Each tick in the Player class on the server it checks the current state of the controls that are set by the
playerControls* network commands. When a control is pressed the entity is altered (rotated or the velocity set).

The server streams all the simulation updates to the connected clients and that is how this example works.

Players can only move around. There is no "game" with this example, it exists to show you how to successfully create
a multiplayer environment with each player controlling their entity and synchronising the simulation to all clients.