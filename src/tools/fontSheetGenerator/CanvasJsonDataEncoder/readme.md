# Canvas JSON Data Encoder
Encodes / decodes JSON data onto a canvas element in the form of pixels.

## How to Use
Include the script in your head:
	`<script type="text/javascript" src="./canvasDataEncoder.js"></script>`

Now create a canvas element and call the canvasDataEncoder.encode() method with the correct parameters.

###Method definitions:

####Encoder:

#####Returns null at all times.

function canvasDataEncoder.encode(canvasObject, x, y, maxX, data);

    canvasObject - Is the HTML canvas element to render to.

    x - The x co-ordinate to start rendering to.

    y - The y co-ordinate to start rendering to.

    maxX - The maximum number of pixels to paint horizontally. When this limit is reached, rendering continues on the next line of pixels below.

    data - The JSON object to encode in pixels.

####Decoder:

#####Returns the decoded JSON object.

function canvasDataDecoder.encode(canvasObject, x, y, maxX);

    canvasObject - Is the HTML canvas element to read pixel data from.

    x - The x co-ordinate to start reading pixel data from.

    y - The y co-ordinate to start reading pixel data from.

    maxX - The maximum number of pixels to read horizontally. When this limit is reached, reading continues on the next line of pixels below.

##Example

Load the index.html file to see a live example. Make sure you have your JavaScript console open so that you can see the decoded object in the console output.