// Define jsRender helper methods
var jsRenderVars = {};

if (jsviews) { 
	jsviews.helpers({
		forVal: function (num) {
			num = Math.round(Number(num));
			
			var arr = [];
			for (var i = 0; i < num; i++) {
				arr.push(i);
			}
			
			return arr; 
		},
		
		forNum: function () {
			var num,
				startVal = 0,
				i;
			
			if (arguments.length === 1) {
				num = arguments[0];
			} else {
				startVal = arguments[0];
				num = arguments[1];
			}
			
			num = Math.round(Number(num));
			
			var arr = [];
			for (i = startVal; i <= num; i++) {
				arr.push({num: i});
			}
			
			return arr; 
		},
		
		forEach: function (arr) {
			var finalArr = [];
			for (var i in arr) {
				finalArr.push(arr[i]);
			}
			
			return finalArr;
		},
		
		percentage: function (val, total) {
			return Math.floor((100 / total) * val);
		},
		
		isMobile: function () {
			return jQuery.browser.iphone || jQuery.browser.ipad || jQuery.browser.android;
		},
		
		isoDateToTs: function (date) {
			return new Date(date).getTime();
		},
		
		format: function( val, format ) {
			switch( format ) {
				case "upper":
					return val.toUpperCase();
				case "lower":
					return val.toLowerCase();
			}
		},
		
		user: function () {
			return app.session.profile() || {};
		},
		
		thisUser: function (profileId) {
			var profile = app.session.profile();
			if (profile) {
				return profileId == profile.id;
			} else {
				return false;
			}
		},
		
		nl2br: function (msg) {
			if (msg) {
				return msg.replace(/\n/ig, '<br />');
			} else {
				return '';
			}
		},
		
		countText: function (str) {
			return str.length;
		},
		
		collapsePost: function (msg) {
			if (msg) {
				if (msg.length <= 1000) {
					var re = new RegExp('{-img data-app-type="post"-}', 'g'),
						matchArr = msg.match(re);
					
					return matchArr && matchArr.length > 1;
				} else {
					return true;
				}
			} else {
				return false;
			}
		},
		
		countPostImages: function (msg) {
			var re = new RegExp('{-img data-app-type="post"-}', 'g'),
				matchArr = msg.match(re);
			
			return matchArr.length;
		},
		
		renderPostImages: function (msg, postImages) {
			if (msg) {
				if (postImages && postImages.length) {
					var sizeTag = '', originalTag = '';
					
					for (var i = 0; i < postImages.length; i++) {
						if (postImages[i].gae !== false) {
							sizeTag = '=s300';
							originalTag = '=s0';
						}
						
						msg = msg.replace('{-img data-app-type="post"-}', '<a href="' + postImages[i].url + originalTag + '" data-app-static="1" target="_blank"><img src="' + postImages[i].url + sizeTag + '" width="300" /></a>')
					}
				}
			} else {
				return '';
			}
			
			return msg;
		},
		
		currencySymbol: function (fx) {
			var symbol;
			switch (fx) {
				case 'usd':
					symbol = "$";
					break;
				
				case 'gbp':
					symbol = "£";
					break;
				
				case 'eur':
					symbol = "€";
					break;
				
				case 'thb':
					symbol = "฿";
					break;
				
				case 'jpy':
				case 'cny':
					symbol = "¥";
					break;
				
				default:
					symbol = 'None';
					break;
			}
			
			return symbol;
		},
		
		currentHref: function () {
			return String(window.location);
		},
		
		convertUrls: function (msg) {
			if (msg) {
				var hyperlinkExp = /(http|ftp|https):\/\/[\w-]+(\.[\w-]+)+(?![^\s]*?")([\w.,@?^=%&amp;:\/~+#-]*[\w@?^=%&amp;\/~+#-])?/ig,
					results,
					replace = [],
					i, imgUrl;
				
				msg = msg.replace(/\n/ig, '<br />');
				
				results = msg.match(hyperlinkExp);
				
				if (results) {
					for (i = 0; i < results.length; i++) {
						if (results[i].search(/www\.youtube\.com\/watch/ig) > -1) {
							// This link is a youtube video, grab the video thumbnail
							var args = results[i].match(/v=(.*?)$/i);
							// Disabled old link code here, new code below embeds video
							//imgUrl = 'http://img.youtube.com/vi/' + args[1] + '/0.jpg';
							//msg = msg.replace(results[i], '<a href="' + results[i] + '" target="_blank" data-app-static="1" class="meta-attachment screenshot"><img class="screenshot-image" src="' + imgUrl + '" width="350" /></a>');
							
							// Embed video
							msg = msg.replace(results[i], '<iframe width="350" height="263" src="http://www.youtube-nocookie.com/embed/' + args[1] + '" frameborder="0" allowfullscreen></iframe>');
						} else {
							// Commented to turn off STS on hrefs
							//replace[i] = encodeURIComponent(results[i]);
							//msg = msg.replace(results[i], '<a href="' + results[i] + '" target="_blank" data-app-static="1" class="meta-attachment screenshot"><img class="screenshot-image" data-sts-url="' + results[i] + '" data-sts-options="{\'clipH\': 600, \'scaleW\': 350}" width="350" /></a>');
							msg = msg.replace(results[i], '<a href="' + results[i] + '" target="_blank" data-app-static="1">' + decodeURI(results[i]) + '</a>');
						}
					}
				}
				
				return msg;
			} else {
				return '';
			}
		},
		
		data: function (key, value) {
			if (key !== undefined) {
				if (value !== undefined) {
					jsRenderVars[key] = value;
				} else {
					return jsRenderVars[key];
				}
			}
		},
		
		urlEncode: function (str) {
			if (!str) { return ''; }
			return encodeURIComponent(str);
		},
		
		urlDecode: function (str) {
			if (!str) { return ''; }
			return window.urlDecode(str);
		},
		
		strToLower: function (str) {
			if (!str) { return ''; }
			return str.toLowerCase();
		},
		
		strToUpper: function (str) {
			if (!str) { return ''; }
			return str.toUpperCase();
		},
		
		cleanText: function (str) {
			if (!str) { return ''; }
			return str.replace(/'/g, '');
		},
		
		limitArray: function (arr, limit) {
			if (arr && arr.length && limit) {
				var newArr = [],
					i, arrCount;
				
				arrCount = arr.length;
				
				for (i = 0; i < arrCount && i < limit; i++) {
					newArr.push(arr[i]);
				}
				
				return newArr;
			} else {
				return arr;
			}
		},
		
		log: function (obj) {
			console.log(obj);
		},
		
		isClient: function () {
			return true;
		},
		
		partToUrl: function (partObj) {
			return app.navPartsToUrl(partObj);
		}
	});
} else {
	// Error loading jsRender?
}