kernel
.define('page.sector.Controller')

// .require('Page')

/**
 *
 */
.construct(function () {
	kernel.console('--*--');
})


/**
 *
 */
.property('beforeInsert', function (a) {
	kernel.console('---beforeInsert---');
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
