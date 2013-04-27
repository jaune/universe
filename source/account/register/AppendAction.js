kernel
.define('account.register.AppendAction')

/**
 *
 */
.use('mail')
.use('urlize')
.use('recaptcha')
.use('account.hasher@hasher')

/**
 *
 */
.use('input', {
	'mail': {
		'name': 'email',
		'description': 'Courriel de l\'utilisateur souhaitant s\'enregister.'
	},
	'response': {
		'name': 'recaptcha_response_field',
		'description': 'reCaptcha response.'
	},
	'challenge': {
		'name': 'recaptcha_challenge_field',
		'description': 'reCaptcha challenge.'
	}
})


/**
 *
 */
.property('run', function (next) {
	var me = this;
	var challenge = this.input.challenge;
	var response = this.input.response;
	var ip = '172.0.0.1';

	kernel.console(this.input);

	this.recaptcha.verify(ip, challenge, response, function (error) {
		if (error) { return next(error); }
		me.sendMail(function (error) {
			if (error) { return next(error); }
			next();
		});
	});
})

.property('sendMail', function (next) {
	var to = this.input.mail;

	var secret = this.hasher.digest(to);
	var url = this.urlize('account/confirm.form', 'display', {
		'#secret':  secret,
		'#mail': to
	});

	this.mail.send({
		to: to,
		subject: 'Confirm ✔',
		text: 'Confirm ✔ ('+url+')',
		html: '<a href="'+url+'">Confirm ✔</b>'
	}, next);
});

;