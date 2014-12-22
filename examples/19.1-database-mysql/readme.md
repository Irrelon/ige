# Database Demo Using MySQL
This demo shows how to use the built-in MySQL database component. The demo is a server-only, console-only demo so no
graphics output should be expected.

# Server-Side
The server-side code will attempt to connect to a MySQL server located at localhost:3306 with the user "root" and a
blank password. It will try to select the "mysql" database (which comes with every mysql installation) and will try to
dump the first row of data from the "user" table. To run the server for this demo, use the command (replacing the paths
depending on where your IGE installation is located):
	node ./ige/server/ige -g ./ige/tests/19.1-database-mysql/

# Client-Side
Nothing happens client-side, this is a server-only demo.