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
var canvasDataEncoder = (function () {
	function encode(canvas, x, y, maxX, data) {
		"use strict";
		// Stringify the data
		var stringData = JSON.stringify(data),
			ctx = canvas.getContext('2d'),
			quartet,
			quartets = [],
			currentX = 0, currentY = 0,
			i;

		// Make sure the string has a length divisible by 3,
		// or add padding
		while (stringData.length % 3 > 0) {
			stringData += ' ';
		}

		// Loop the string and generate quartet pixel data
		for (i = 0; i < stringData.length; i += 3) {
			quartet = [
				stringData.charCodeAt(i),
				stringData.charCodeAt(i + 1),
				stringData.charCodeAt(i + 2),
				255 // The last value is always 255 to represent full alpha
			];

			quartets.push(quartet);
		}

		// Add the terminal quartet
		quartets.push([3, 2, 1, 255]);

		// Loop the quartets and paint them!
		for (i = 0; i < quartets.length; i++) {
			quartet = quartets[i];
			ctx.fillStyle = 'rgba(' + quartet[0] + ', ' + quartet[1] + ', ' + quartet[2] + ', 255)';
			ctx.fillRect(x + currentX, y + currentY, 1, 1);

			currentX++;
			if (currentX >= maxX) { currentX = 0; currentY++; }
		}

		return currentY + 1; // Return the number of rows we spanned
	}

	function decode(canvas, x, y, maxX) {
		"use strict";
		var ctx = canvas.getContext('2d'),
			imageData = ctx.getImageData(x, y, maxX, canvas.height).data,
			run = true,
			quadCode,
			i = 0,
			jsonString = '';

		while (run) {
			quadCode = String(imageData[i]) + ' ' + String(imageData[i + 1]) + ' ' + String(imageData[i + 2]);
			if (quadCode === '3 2 1') {
				// We have scanned the terminal code
				// so exit the loop
				run = false;
				return JSON.parse(jsonString);
			} else {
				jsonString += String.fromCharCode(imageData[i]) + String.fromCharCode(imageData[i + 1]) + String.fromCharCode(imageData[i + 2]);
			}
			i += 4;

			if (i > imageData.length) {
				run = false;
				console.log('Image JSON Decode Error!');
			}
		}
	}

	return {encode:encode, decode:decode};
}());