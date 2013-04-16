# Database Demo Using MongoDB
This demo shows how to use the built-in MongoDB database component. The demo is a server-only, console-only demo so no
graphics output should be expected.

# Server-Side
The server-side code will attempt to connect to a MongoDB server located at localhost:27017 with a blank user and a
blank password. It will use the "test" database (defined in ServerConfig.js) and will run these operations on the "user"
collection:

* Insert a dummy entry
* Run a find and console.log the results which will include the dummy entry
* Delete the dummy entry

To run the server for this demo, use the command (replacing the paths
depending on where your IGE installation is located):
	node ./ige/server/ige -g ./ige/tests/19.2-database-mongodb/

# Client-Side
Nothing happens client-side, this is a server-only demo.