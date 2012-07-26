// Utility functions
var utils = function() {
	var self = this;
	self.frame = '~m~';

	self.stringify = function(message) {
		if(Object.prototype.toString.call(message) == '[object Object]') {
			return '~j~' + JSON.stringify(message);
		}

		else {
			return String(message);
		}
	};

	self.encode = function(messages) {
		var ret = '',
			message,
			i;

		messages = Array.isArray(messages) ? messages : [messages];

		for(i = 0, l = messages.length; i < l; i++) {
			message = messages[i] === null || messages[i] === undefined ? '' : self.stringify(messages[i]);
			ret += self.frame + message.length + self.frame + message;
		}

		return ret;
	};

	self.decode = function(data) {
		var messages = [], number, n, i;
		do {
			if(data.substr(0, 3) !== self.frame) {
				return messages;
			}

			data = data.substr(3);
			number = '';
			n = '';

			for(i = 0, l = data.length; i < l; i++) {
				n = Number(data.substr(i, 1));
				if(data.substr(i, 1) == n) {
					number += n;
				} else {
					data = data.substr(number.length + self.frame.length);
					number = Number(number);
					break;
				}
			}

			messages.push(data.substr(0, number)); // here
			data = data.substr(number);
		} while(data !== '');

		return messages;
	};
};

// Websocket client
var IoNoDom = IgeEventingClass.extend({
	connect: function(url, proto) {
		var self = this;
		self.util = new utils();
		self.heartbeat = '~h~';
		self.sessionId = null;

		self.eventtypes = {
			open : 1,
			close : 1,
			message : 1
		};

		self.socket = new WebSocket(url, proto);
		self.socket.onopen = function () {
			console.log(self.socket);
		};
		self.socket.onerror = function (data) {
			console.log('socket error', data);
		};
		self.socket.onmessage = function(data) {
			if (self.sessionId === null) {
				var msg = data.data.split(':');
				self.sessionId = msg[0];
				console.log('New session ID ', self.sessionId);
			}
			//console.log('incomming', data);
			//self._onmessage(self.util.decode(data.data));
		};
		self.socket.onclose = function() {
			self.emit('close', self.sessionId);
			/*self.listeners = {};*/
			self.sessionId = null;
		};

		/*self._apply = function(event, data) {
			if(self.listeners[event]) {
				self.listeners[event].forEach(function(callback) {
					callback(data);
				});
			}
		};*/

		self._onmessage = function(data) {
			data = data[0];
			console.log('incomming', data);
			// The first message received is always the session id
			if(!self.sessionId) {
				self.sessionId = data;
				self.emit('open', self.sessionId);
				return;
			}

			// Handle websocket connection heartbeats
			if(data.substr(0, 3) === self.heartbeat) {
				self.socket.send(self.util.encode(self.heartbeat+data.substr(3)));
				return;
			}

			self.emit('message', data);
		};

		// Public API
		/*self.on = function(event, callback) {
			if(!self.eventtypes[event]) {
				throw new Error('Unknown event type: '+event);
			}

			if(!self.listeners[event]) {
				self.listeners[event] = [];
			}
			self.listeners[event].push(callback);
		};*/

		self.send = function(data) {
			self.socket.send(self.util.encode(data));
		};

		self.close = function() {
			self.socket.close();
			self.emit('close', self.sessionId);
			/*self.listeners = {};*/
			self.sessionId = null;
		};

		return this;
	}
});

ioNoDom = new IoNoDom();