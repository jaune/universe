kernel
.define('input.wwwform.Parser')
.inherits('event.Emitter')

/**
 *
 */
.method('write', function (buffer) {
	kernel.console('input.wwwform.Parser#write()');
})

/**
 *
 */
.method('end', function () {

	kernel.console('input.wwwform.Parser#end()');

	this.emit('end');
})

;