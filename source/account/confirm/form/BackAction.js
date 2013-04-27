kernel
.define('account.confirm.form.BackAction')

/**
 *
 */
.use('urlize')
.use('template')

/**
 *
 */
.property('run', function (next) {
	var url = this.urlize('account/confirm');

	this.template.locals.action = url;
	this.template.locals.method = 'POST';

	next();
})

;