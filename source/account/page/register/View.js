kernel
.define('account.page.register.View')
.use('template')
.use('recaptcha')

/**
 *
 */
.property('render', function () {

	this.template.locals({
		'action': '/resource/account/register/',
		'method': 'POST',
		'recaptcha' : {
			'key': this.recaptcha.getPublicKey()
		}
	});

})

;
