kernel
.define('event.Emitter')

/**
 *
 */
.attribute('listeners')

/**
 *
 */
.constructor(function () {
	this.listeners = {};
})

/**
 *
 */
.method('on', function (event, listener) {
	if (!this.listeners.hasOwnProperty(event)) {
		this.listeners[event] = [];
	}
	this.listeners[event].push(listener);
	return this;
})

/**
 *
 */
.method('emit', function () {
	var length = arguments.length;

	if (length < 1) {
		throw new TypeError('TODO');
	}

	var event = arguments[0];

	if (!this.listeners.hasOwnProperty(event)) {
		return;
	}

	var i = 1, parameters = [];

	for (; i < length; i++) {
		parameters.push(arguments[i]);
	}

	this.listeners[event].forEach(function (listener) {
		listener.apply(null, parameters);
	});

	return this;
})

;