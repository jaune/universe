kernel
.define('account.FrontController')

/**
 *
 */
.use('rest', 'get')
.use('template')
.use('recaptcha')
.property('register_form', function (next) {

	this.template.locals({
		'action': '/resource/account/register/',
		'method': 'POST',
		'recaptcha' : {
			'key': this.recaptcha.getPublicKey()
		}
	});

	next();
})

/**
 *
 */
.use('rest', 'get')
.use('template')
.property('confirm_form', function (next) {

	this.template.locals({
		'action': '/resource/account/register/',
		'method': 'POST',
		'recaptcha' : {
			'key': this.recaptcha.getPublicKey()
		}
	});

	next();
})


/**
 *
 */
.use('mail')
.use('action')
.use('input', {
	'mail': {
		'name': 'mail',
		'description': 'Courriel de l\'utilisateur souhaitant s\'enregister.'
	}
})
.use('symmetric-cipher@cipher')
.use('hasher', 'sha1')
.property('register', function (next) {
	var to = this.input.mail;

	var secret = cipher.crypt(JSON.stringify([
		'Adrien',
		hasher.hash(to)
	]));
	var url = this.action.create('account.Controller', 'confirm_form', {
		'secret':  secret,
		'mail', to
	}).urlize();

	this.mail.send({
		to: to,
		subject: 'Confirm ✔',
		text: 'Confirm ✔ ('+url+')',
		html: '<a href="'+url+'">Confirm ✔</b>'
	}, function (error) {
		if (error) { return next(error); }
		next();
	});
})

/**
 *
 */
.use('rest', 'post')
.use('template')
.property('confirm', function (next) {

	this.template.locals({
		'action': '/resource/account/register/',
		'method': 'POST',
		'recaptcha' : {
			'key': this.recaptcha.getPublicKey()
		}
	});

	next();
})

;
