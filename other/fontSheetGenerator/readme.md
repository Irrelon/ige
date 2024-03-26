> This tool is severely out of date. Written in 2012, it needs some TLC. It should be fairly easy to make it work
> with modern tooling and using TS. The SWF that got the available system fonts won't work either now since flash
> is no longer a thing. I suspect doing a font-sniffing process would be all we need to grab the available system
> fonts, then use the modern web font loader api to get the ones that are actually loaded.

Proposed font sniffing could work like this:

```typescript
const testElement = document.createElement('div');
testElement.textContent = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
testElement.style.visibility = 'hidden';
testElement.style.position = 'absolute';
testElement.style.top = '-9999px';
document.body.appendChild(testElement);

// List of common system font families
const systemFonts = [
	'Arial',
	'Helvetica',
	'Times New Roman',
	'Times',
	'Courier New',
	'Courier',
	'Verdana',
	'Georgia',
	'Palatino',
	'Garamond',
	'Bookman',
	'Comic Sans MS',
	'Trebuchet MS',
	'Arial Black',
	'Impact',
	'Lucida Sans Unicode',
	'Tahoma',
	'Geneva',
	'Lucida Grande',
	'Arial Narrow',
	'sans-serif',
	'serif',
	'monospace'
];

// Array to hold detected fonts
const availableFonts = [];

// Check each font
systemFonts.forEach(font => {
	testElement.style.fontFamily = font;
	if (window.getComputedStyle(testElement).fontFamily === font) {
		availableFonts.push(font);
	}
});

// Remove the test element
document.body.removeChild(testElement);

// Log the list of available fonts
console.log('Available System Fonts:', availableFonts);
```

# Irrelon Canvas Font Sheet Generator

This tool allows you to generate font sheets that you can use with your Isogenic Game Engine game
projects to render any font in your game without the font being available on the target platform / device.
It creates an image from the font with all the letters, numbers and symbols that you might want to use.
You can then save the image for use in your project.

## Live Version

http://www.isogenicengine.com/tools/fontSheetGenerator

## Features

* Scans all fonts on your computer using a Flash swf
* Supports cursive fonts and odd-shaped fonts
* Preview your sheet before generating
* Use Google Web Fonts by specifying the font name and clicking "Load Font"
* Generated image contains pixel-encoded JSON data with the original image settings so they can be read and identified
  at a future time

## Example Output

![](http://www.isogenicengine.com/tools/fontSheetGenerator/example/kunstler_script_26pt.png)

## Deployment

Upload the files to a web server with PHP enabled (the project uses XHR which will probably not work
from a standard file folder so uploading to a web server or loading from a local server is recommended).

## Usage

The system has only been tested in Google Chrome 19. Other browsers may work but may also mess up the
font positioning.

Load the index.html file. Select your font settings and click "Generate Sheet...".

Once your sheet has been generated (can take some time for very large font sizes), you can click the
"Save Image..." button which will open a new page with an image which you can save anywhere you like.

The save functionality uses PHP to decode the data URI and send back the image to the browser. This is to
solve a problem with Chrome 19 not being able to save images from a data URI.

## License

Open Source MIT license.
