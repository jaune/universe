kernel
.define('account.page.confirm.View')

/**
 *
 */
.use('template')
.use('input/query', ['key'])
.property('render', function (key) {

	this.template.locals({
		'key': key
	});
})

;
