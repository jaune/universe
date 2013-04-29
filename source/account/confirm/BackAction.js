kernel
.define('account.confirm.BackAction')

/**
 *
 */
.use('mail')
.use('urlize')
.use('recaptcha')
.use('input', {
	'mail': {
		'name': 'mail',
		'description': 'Courriel de l\'utilisateur souhaitant s\'enregister.'
	},
	'secret': {
		'name': 'secret',
		'description': 'Signature du courriel.'
	},
	'response': {
		'name': 'response',
		'description': 'reCaptcha response.'
	},
	'challenge': {
		'name': 'challenge',
		'description': 'reCaptcha challenge.'
	}
})
.use('account.hasher@hasher')

/**
 *
 */
.property('run', function (next) {
	var mail = this.input.mail;
	var secret = this.input.secret;
	var challenge = this.input.challenge;
	var response = this.input.response;
	var ip = '172.0.0.1';
	var me = this;

	this.recaptcha.verify(ip, challenge, response, function (error) {
		if (error) { return next(error); }

		if (!this.hasher.verify(mail, secret)) {
			return next('TODO');
		} else {
			me.sendMail(function (error) {
				if (error) { return next(error); }
				next();
			});
		}
	});

})

.property('sendMail', function (next) {
	var to = this.input.mail;

	var secret = this.hasher.digest(to);
	var url = this.urlize('account/confirm.form', {
		'#secret':  secret,
		'#mail': to
	});

	this.mail.send({
		to: to,
		subject: 'Confirm ✔',
		text: 'Confirm ✔ ('+url+')',
		html: '<a href="'+url+'">Confirm ✔</b>'
	}, next);
})

;