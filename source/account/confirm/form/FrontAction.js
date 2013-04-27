kernel
.define('account.confirm.form.FrontAction')

/**
 *
 */
.use('input', {
	'mail': {
		'name': '#mail',
		'description': 'Courriel de l\'utilisateur souhaitant s\'enregister.'
	}
	'secret': {
		'name': '#secret',
		'description': 'Signature du courriel.'
	}
})
.use('template')

/**
 *
 */
.property('run', function () {
	this.template.locals({
		mail: this.input.mail,
		secret: this.input.secret
	});
})

;