# Notes

## IgeCellSheet Isometric

Fix isometric tile rendering from IgeCellSheet instances.

## IgeUiElement stacked events

When using IgeUiElement's that are stacked on each other (mounted),
pointer events like pointerUp appear to bubble from the bottom up
instead of top-down so elements deeper in the scene graph don't
get their events. You have to switch pointerEventsActive(false)
on the container element to get the child elements to work.
This might be what we want to do but I need to think about it more
and also have a VERY clear documentation if this is the way we
should be doing things.

## Server-Based Instancing and Routing

Right now our game scene router makes sense for single instances
but what we need is a system where we can request the server starts
a new instance based on a scene (which could be as simple as a
"GameScene" instance, or as advanced as loading specific data for
the instance so that things like tile maps etc are specific to the
instance while general stuff like game logic is shared) and then
once the instance is started, the client is told what IP and port
to connect to.

We need to design an architecture where game routes are specified
ahead of time on the server, then when requested, the primary
server can spin up new instances and tell players about it.

An example might be a polytopia game where each instance is going
to specific to a particular game or saved game. When the instance
is requested, we load the game data from persistent storage or
create new storage if it's new. Then we tell the client the game
id. The client can then connect to the correct game instance.

Other players can be invited by a game URL which will connect them
to the same instance IP and port. When all players close all
browsers, the instance is shut down to save memory and cost.

In a starflight-like game, the world is persistent and shared among
all players so joining doesnt' fire up a new instance but we need
a way to tell IGE to create servers for each area of the world.
When no players are connected, those areas need to be shut down.
As the players navigate around the universe and want to travel to
an area, the server is started and resumed from persistent state.

Right now, the server is a one-to-one system and only serves one
area. StarFlight has some of this more advanced stuff in place
already, worth checking how we've gone about it there.