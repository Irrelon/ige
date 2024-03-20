/**
 * Copyright (c) 2012 Irrelon Software Limited
 * http://www.isogenicengine.com
 *
 * Permission is hereby granted, free of charge, to any person obtaining
 * a copy of this software and associated documentation files (the
 * "Software"), to deal in the Software without restriction, including
 * without limitation the rights to use, copy, modify, merge, publish,
 * distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so, subject to
 * the following conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
 * LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 * OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
 * WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

// TODO: Follow this pseudo-code in the next version:
	// Draw each character to a back-buffer and measure the start x, y and width, height
	// if any part of the character is larger than the back-buffer, adjust the back-buffer size and rescan until no part of the character is painting opaque pixels at the outer edges
	// loop each character and determine the maximum width and height
	// set the front-buffer height to maxheight + 4 pixels
	// draw the first 3 lines of the image as header data, measured width and actual pixel width of each character
	// draw the character from pixel line 4
	// max width of total image shouldn't exceed 1024 - after rendering,
	// cut up image and arrange each 1024 block under the last which can be re-assembled
	// at the other end. Have the 1024 width limit as an optional value that is stored in the
	// header
var allFonts = [],
	characterArr = [];

// This function is called by the Flash swf and passed
// an array of font names
function populateFontList(fontArr) {
	"use strict";
	var arrCount = fontArr.length,
		fontIndex;

	for (fontIndex = 0; fontIndex < arrCount; fontIndex++) {
		allFonts.push(fontArr[fontIndex]);
	}

	updateFontSelect();
}

function updateFontSelect () {
	"use strict";
	var fontListElement = $('#fontList'),
		fontIndex,
		arrCount,
		op;

	// Sort the fonts
	allFonts.sort();

	// Clear the current list
	fontListElement.html('');

	// Create a blank selection
	$('<option></option>')
		.attr('value', '')
		.text('Select a font...')
		.appendTo(fontListElement);

	// Loop fonts and add them to the font list
	arrCount = allFonts.length;

	for (fontIndex = 0; fontIndex < arrCount; fontIndex++) {
		op = $('<option></option>');
		op.attr('value', allFonts[fontIndex]);
		op.text(allFonts[fontIndex]);
		op.appendTo(fontListElement);
	}
}

function addGoogleWebFont (fontName) {
	"use strict";
	// Add the web font link element to the head
	$('<link id="gwf_' + fontName + '" href="http://fonts.googleapis.com/css?family=' + fontName + '" rel="stylesheet" type="text/css">')
		.load(function () {
			console.log('Google Web Font Loaded: ' + fontName);

			// Add the font to the font list
			allFonts.push(fontName);

			// Create an element on the page to use the font
			// so that it is available when we want to render it
			$('<div class="webFontPreLoad" style="font-family: ' + fontName + ';">abc123</div>').appendTo('body');

			// Update the selection
			updateFontSelect();

			// Tell the user
			$('#fontLoaded').html('Web Font ' + fontName + ' loaded!');

			// Clear the font name box
			$('#fontName').val('');
		}).appendTo($('head'));
}

function displayPreview () {
	"use strict";
	var fontName = $('#fontList').val(),
		fontSize = parseInt($('#fontSize').val(), 10),
		fontSizeUnit = $('#fontSizeUnit').val(),
		fontColor = $('#fontColor').val(),
		fontStyle = $('#fontStyle').val(),
		fontWeight = $('#fontWeight').val(),
		characterSpacing = parseInt($('#characterSpacing').val(), 10),
		characterList = $('#characterList').val(),
		fontPreview = $('#fontPreview'),
		characterIndex,
		r, g, b, colorTotal, backColor;

	// Work out the inverse font color
	r = parseInt(fontColor.substr(1, 2), 16);
	g = parseInt(fontColor.substr(3, 2), 16);
	b = parseInt(fontColor.substr(5, 2), 16);

	colorTotal = ((r + b + g) / 3) | 0;
	if (colorTotal > 128) {
		// Set the background as black
		backColor = '#000000';
	} else {
		// Set the background as white
		backColor = '#ffffff';
	}

	// Set the background to the inverse
	// so that the characters are clearly visible
	$('#fontPreview').css('background-color', backColor)
		.css('color', fontColor);
	$('.fontScroll').css('background-color', backColor);

	// Clear the character array
	characterArr = [];
	fontPreview.html('');

	// Generate an array of all the characters we want to draw
	for(characterIndex = 0; characterIndex < characterList.length; characterIndex++) {
		characterArr.push(characterList[characterIndex]);
		fontPreview.html(fontPreview.html() + characterArr[characterArr.length - 1]);
	}

	if (fontName) {
		$('#fontPreview')
			.css('font-family', '"' + fontName + '"')
			.css('font-size', fontSize + fontSizeUnit)
			.css('font-style', fontStyle)
			.css('font-weight', fontWeight)
			.css('letter-spacing', characterSpacing + 'px');

		$('.fontPreviewName').html(' - ' + fontName + ' @ ' + fontSize + fontSizeUnit + ' ' + fontStyle + ' ' + fontWeight + ' ');
		$('#previewWell').show();
		$('#finalWell').hide();
	} else {
		$('#previewWell').hide();
		$('#finalWell').hide();
	}
}

function generateCanvasFont() {
	"use strict";
	var fontName = $('#fontList').val(),
		fontSize = parseInt($('#fontSize').val(), 10),
		fontSizeUnit = $('#fontSizeUnit').val(),
		fontColor = $('#fontColor').val(),
		fontStyle = $('#fontStyle').val(),
		fontWeight = $('#fontWeight').val(),
		characterSpacing = parseInt($('#characterSpacing').val(), 10),
		characterList = $('#characterList').val(),
		drawDebug = $('#debugCanvas:checked').val(),
		canvas = $('#fontPreviewCanvas')[0],
		ctx = canvas.getContext('2d'),
		// Create a temporary back-buffer canvas
		backBuffer = $('#fontPreviewBackBuffer')[0],
		backBufferCtx = backBuffer.getContext('2d'),
		// Some variables we are going to use
		characterIndex,
		widthArr = [],
		pixelShiftXArr = [],
		pixelShiftYArr = [],
		pixelWidthArr = [],
		pixelHeightArr = [],
		maxWidth = 0,
		maxHeight = 0,
		canvasWidth = 0,
		arrCount,
		xSpace,
		imageData,
		x, y,
		foundMinX, foundMinY,
		foundMaxX, foundMaxY,
		charCodes = {},
		charPosition = [],
		data;

	// Set back buffer size
	backBuffer.width = fontSize * 4;
	backBuffer.height = fontSize * 4;

	// Set the canvas font data
	backBufferCtx.font = fontStyle + ' ' + fontWeight + ' ' + fontSize + fontSizeUnit + ' "' + fontName + '"';
	backBufferCtx.textBaseline = 'top';

	// Loop each character and draw it to the back buffer
	// in the center position and then measure it via
	// the getImageData() return data - the only reliable
	// way to get a character's total width
	arrCount = characterArr.length;
	for(characterIndex = 1; characterIndex < arrCount; characterIndex++) {
		// Draw the character
		backBufferCtx.clearRect(0, 0, backBuffer.width, backBuffer.height);
		backBufferCtx.fillText(characterArr[characterIndex], ((backBuffer.width / 2) - fontSize) | 0, 0);
		widthArr[characterIndex] = backBufferCtx.measureText(characterArr[characterIndex]).width;

		// Grab the image data from the canvas
		imageData = backBufferCtx.getImageData(0, 0, backBuffer.width, backBuffer.height).data;

		// Loop the data from right to left and scan each pixel column
		// and check for non-transparent pixels
		foundMaxX = 0;
		foundMaxY = 0;
		foundMinX = backBuffer.width;
		for (x = backBuffer.width - 1; x >= 0; x--) {
			for (y = backBuffer.height - 1; y >= 0; y--) {
				if(imageData[(y * (backBuffer.width * 4)) + (x * 4) + 3]) {
					foundMinX = foundMinX < x ? foundMinX : x;
					foundMinY = foundMinY < y ? foundMinY : y;

					foundMaxX = foundMaxX > x ? foundMaxX : x;
					foundMaxY = foundMaxY > y ? foundMaxY : y;
					break;
				}
			}
		}

		// If we have a negative pixel horizontal starting point,
		// record it as a positive value, otherwise record zero
		pixelShiftXArr[characterIndex] = (foundMinX - (((backBuffer.width / 2) - fontSize) | 0)) < 0 ? -(foundMinX - (((backBuffer.width / 2) - fontSize) | 0)) : 0;
		pixelShiftYArr[characterIndex] = foundMinY < 0 ? -foundMinY : 0;
		pixelWidthArr[characterIndex] = ((foundMaxX - (((backBuffer.width / 2) - fontSize) | 0)) + pixelShiftXArr[characterIndex]) + 1;
		pixelHeightArr[characterIndex] = foundMaxY;

		canvasWidth += (widthArr[characterIndex] > pixelWidthArr[characterIndex] ? widthArr[characterIndex] : pixelWidthArr[characterIndex]) + characterSpacing;
		maxWidth = (widthArr[characterIndex] > pixelWidthArr[characterIndex] ? widthArr[characterIndex] : pixelWidthArr[characterIndex]);
		maxHeight = pixelHeightArr[characterIndex] > maxHeight ? pixelHeightArr[characterIndex] : maxHeight;
	}

	// Set the space character w/h
	widthArr[0] = widthArr[1];
	pixelShiftXArr[0] = pixelShiftXArr[1];
	pixelWidthArr[0] = pixelWidthArr[1];
	pixelHeightArr[0] = pixelHeightArr[1];

	// Update the maxHeight
	maxHeight += (foundMinY / 2) + 2;

	// Set the output canvas size
	canvas.width = canvasWidth + (pixelWidthArr[0] > widthArr[0] ? pixelWidthArr[0] : widthArr[0]);
	canvas.height = maxHeight + 10;

	// Set the canvas font data
	ctx.font = fontStyle + ' ' + fontWeight + ' ' + fontSize + fontSizeUnit + ' "' + fontName + '"';
	ctx.textBaseline = 'top';

	// Clear the canvas
	ctx.clearRect(0, 0, canvas.width, canvas.height);

	// Now loop again and draw the width lines
	xSpace = 0;
	arrCount = characterArr.length;
	ctx.fillStyle = fontColor;

	for(characterIndex = 0; characterIndex < arrCount; characterIndex++) {
		// Draw the character
		ctx.fillText(characterArr[characterIndex], xSpace + pixelShiftXArr[characterIndex], 6);
		charCodes[characterArr[characterIndex].charCodeAt(0)] = characterIndex;
		charPosition[characterIndex] = xSpace + pixelShiftXArr[characterIndex];

		if (drawDebug) {
			// Draw the character dividing line
			ctx.fillRect(xSpace, 6, 1, maxHeight);
		}

		xSpace += (widthArr[characterIndex] > pixelWidthArr[characterIndex] ? widthArr[characterIndex] : pixelWidthArr[characterIndex]) + characterSpacing;
	}

	// Encode and draw the data tag
	canvasDataEncoder.encode(canvas, 0, 0, canvas.width, {
		vendor: {
			generator: 'Irrelon Font Sheet Generator',
			url: 'http://www.isogenicengine.com/tools/fontSheetGenerator/index.html',
			provider: 'Irrelon Software Limited',
			source: 'https://github.com/irrelon/FontSheetGenerator'
		},
		font: {
			fontSize: fontSize,
			fontSizeUnit: fontSizeUnit,
			fontName: fontName,
			fontColor: fontColor,
			fontWeight: fontWeight,
			fontStyle: fontStyle
		},
		characters: {
			characterList: characterList, // Character list
			characterSpacing: characterSpacing, // Character spacing
			charCodes: charCodes, // Array of character codes and their array index,
			charPosition: charPosition, // Array of character x co-ordinates
			measuredWidth: widthArr, // Array of character canvas measured widths
			pixelWidth: pixelWidthArr // Array of character pixel measured widths
		}
	});

	// Update the save button form data to the new image data
	data = $('#fontPreviewCanvas')[0].toDataURL("image/png");
	$('#formImageData').val(data);

	// Set the resulting image file name
	$('#formImageFileName').val(fontName + '_' + fontSize + fontSizeUnit + '.png');

	//$('#previewWell').hide();
	$('#finalWell').show();
}