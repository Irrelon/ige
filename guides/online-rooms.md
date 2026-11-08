# Online games with rooms

`IgeRoomServer` and `IgeRoomClient` give IGE's networking game rooms for turn-based and lockstep games: join codes,
seats players keep when they reconnect, presence, chat, and an ordered command stream. The server holds the
authoritative game state and checks every command; everyone applies the same commands in the same order to their own
copy of the game.

## How it works

1. A player creates a room (`create()`) and gets seat 0, the room code and a snapshot of the starting state.
2. Others join by code (`join()`) and get a free seat and a snapshot of the current state with its sequence number.
3. A player sends a command (`send()`). The server runs your `applyCommand`: return an error message to reject it (only
   the sender hears), otherwise the command goes to everyone in the room with the next sequence number.
4. Every client applies each `"command"` event to its own copy of the game. Commands arrive in order; if a client
   misses one, it asks for a fresh snapshot (`"snapshot"` event) instead of going out of step.

The game state has to be deterministic (the same commands give the same result everywhere) and serialisable for
snapshots.

## Server

```typescript
import { IgeRoomServer, igeRoomServerTransport } from "@/engine/network/rooms/IgeRoomServer";

ige.init();
const network = ige.network as IgeNetIoServerController;
await network.start(8650);

const rooms = new IgeRoomServer(igeRoomServerTransport(network), {
	seats: (options) => options.players,
	createState: (options) => new Game(options),
	applyCommand: (room, seat, command) => room.state.apply(seat, command), // return an error to reject
	snapshot: (room) => room.state.serialize(),
	validateOptions: (options) => (options.players > 8 ? "Too many players" : undefined),
	onChange: (room) => fs.writeFileSync(`games/${room.code}.json`, JSON.stringify(rooms.save(room)))
});
network.acceptConnections(true);
```

- Create the room server before clients connect (it defines its network command).
- `room.apply(seat, command)` applies a move from the server itself (an AI, a turn timer running out); it is checked and
  broadcast like a player's.
- `room.setInfo(info)` sends game-defined room information (turn timers, settings) to everyone; `room.say(text)`
  posts a server chat line.
- `rooms.save(room)` / `rooms.restore(saved, (snapshot) => Game.load(snapshot))` persist rooms across server restarts.
  Saves include the seat tokens, so keep them private.
- `rooms.createRoom(options)` makes a room from the server (matchmaking); `rooms.closeRoom(room)` ends one.

## Client

```typescript
import { IgeRoomClient, igeRoomClientTransport } from "@/engine/network/rooms/IgeRoomClient";

await (ige.network as IgeNetIoClientController).start("ws://localhost:8650");
const rooms = new IgeRoomClient(igeRoomClientTransport(ige.network));

const welcome = await rooms.join("KTRWM", "Rob"); // or rooms.create("Rob", options)
const game = Game.load(welcome.snapshot);
rooms.on("command", ({ seat, command }) => game.apply(seat, command));
rooms.on("snapshot", ({ snapshot }) => game.replaceWith(Game.load(snapshot)));
rooms.on("seats", (seats) => showPlayers(seats)); // names, taken, connected, host
rooms.on("chat", (line) => showChat(line));

rooms.send({ type: "move", unit: 3, to: [4, 7] }); // applied when it comes back in the stream
```

- Seat tokens are kept per room and player name (in `localStorage` by default; pass `tokens` for another store), so
  joining again puts a player back in their own seat, and another name in the same browser gets a seat of its own.
- `rooms.leave()` gives the seat up for good; disconnecting keeps it (the seat shows as not connected).
- Errors for create and join reject their promises; rejected commands arrive as `"error"` events.

## Other transports

Both sides take a transport, so the same rooms can run over a plain WebSocket server instead of IgeNetIo: implement
`IgeRoomServerTransport` (`send(clientId, message)`, `listen(onMessage, onDisconnect)`) and `IgeRoomClientTransport`
(`send(message)`, `listen(onMessage, onDisconnect)`). Messages are plain JSON (`igeRoomProtocol.ts`).
