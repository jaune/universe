kernel
.define('input.wwwform.Parser')
.inherits('event.Emitter')

/**
 *
 */
.attribute('buffer')

/**
 *
 */
.constructor(function () {
	kernel.callConstructor('event.Emitter', this);

	this.buffer = '';
})

/**
 *
 */
.method('write', function (buffer) {
	this.buffer += buffer.toString('utf8');
})

/**
 *
 */
.method('end', function () {
	var couples = this.buffer.split(/&/i);

	couples.forEach(function (couple) {
		var parts = couple.split(/=/i, 2);
		this.emit('input', parts[0], parts[1]);
	}, this);
	this.emit('end');
})

;