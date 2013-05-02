kernel
.define('account.register.form.DisplayAction')

/**
 *
 */
.use('template')
.use('urlize')
.use('recaptcha')

/**
 *
 */
.method('run', function (next) {

	this.template.locals({
		'action': this.urlize('account/register', 'append'),
		'method': 'POST',
		'recaptcha_key' : this.recaptcha.getPublicKey()
	});

	next();

})

;
