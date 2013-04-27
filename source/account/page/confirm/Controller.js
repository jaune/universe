kernel
.define('account.page.confirm.Controller')

// .require('Page')

/**
 *
 */
.construct(function () {
	kernel.console('--page.register.Controller--');
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
