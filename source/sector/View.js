kernel
.define('page.sector.View')

/**
 *
 */
.construct(function () {
	kernel.console('--*--');
})


/**
 *
 */
.property('beforInsert', function (a) {
	kernel.console('---beforInsert---');
})

/**
 *
 */
.property('afterInsert', function (a) {
	kernel.console('---afterInsert---');
})

/**
 *
 */
.property('afterLoad', function (a) {
	kernel.console('---afterLoad---');
})

;
