var express = require('express');
var app = express();
var mongojs = require('mongojs');
var schemas = require('schema')('schemas');
var url = require('url');
var crypto = require('crypto');

var Kernel = require('./source/kernel.js').Kernel;
var kernel = new Kernel();

var ObjectId = mongojs.ObjectId;

var db = mongojs.connect('localhost:27017/mydb', [
	'players',
	'totems',
	'systems',

	'sectors',
	'subsectors',
	'subsectors_via_player'
]);


app.configure(function () {
	app.engine('hbs', require('hbs').__express);
	app.set('view engine', 'hbs');
	app.set('views', __dirname+'/template');


	app.use(express['static'](__dirname));
	app.use(app.router);
	app.use(function (err, req, res, next) {
		console.error(err.stack);
		res.send(500, 'Sorry something bad happened!');
	});
});

var MiddlewareQueue = function () {
	this.middlewares = [];
};

MiddlewareQueue.prototype.queue = function (middleware)  {
	if (typeof middleware !== 'function') {
		throw new TypeError('Argument `middleware` must be a function.');
	}
	this.middlewares.push(middleware);
};

MiddlewareQueue.prototype.unqueue = function () {
	if (this.middlewares.length < 1) {
		return null;
	}
	return this.middlewares.shift();
};

MiddlewareQueue.prototype.execute = function (request, response, next) {
	var me = this;
	var middleware = this.unqueue();
	if (!middleware) {
		return next();
	}
	middleware(request, response, function (error) {
		if (error) { return next(error); }
		me.execute(request, response, next);
	});
};

var parseQuery = function (query) {
	var result = [];

	if (!query || !query.split) {
		return result;
	}

	var couples = query.split(/&/, 2048);
	couples.forEach(function (couple) {
		var parts = couple.split(/=/, 2);
		if (parts.length !== 2) {
			return;
		}
		result.push({
			name: parts[0],
			value: parts[1]
		});
	});
	return result;
};



/*
GET /page/register [page]
GET /page/confirm [page]

POST /store/registers/ [store] // new
POST /store/registers/:id/confirm [store] // update
*/




kernel.
registerServiceFactory('urlize', function () {
	var urlize = function (resource, action, inputs) {
		var names = resource.split('/', 2);
		if (names.length !== 2) {
			throw new Error('Invalid resource name `'+resource+'`.');
		}
		var url = 'http://localhost/action/'+names.join('.');
		switch (action) {
			case 'display':
				break;
			case 'append':
					url += '/';
				break;
			default:
				throw new Error('Unsupported action `'+action+'`.');
		}
		return url;
	};

	return {
		build: function (parameters) {
			return {
				get: function () {
					return urlize;
				}
			};
		}
	};
});

kernel.
registerServiceFactory('recaptcha', function () {
	var simple_recaptcha = require('simple-recaptcha');
	var privateKey = '6Lf-geASAAAAAMN8qR3291En9zVTlasmRctZLacD';
	var publicKey = '6Lf-geASAAAAAJomj3HTvxi0llwvBiE6Eq2Hr5ZQ';

	return {
		build: function (parameters) {
			return {
				get: function () {
					return {
						verify: function (ip, challenge, response, next) {
							simple_recaptcha(privateKey, ip, challenge, response, next);
						},
						getPublicKey: function () {
							return publicKey;
						}
					};
				}
			};
		}
	};
});


kernel.
registerServiceFactory('mail', function () {
	var nodemailer = require('nodemailer');

	var from = 'JauneLaCouleur <jaunelacouleur@gmail.com>';

	var smtpTransport = nodemailer.createTransport("SMTP", {
		service: 'Gmail',
		auth: {
			user: 'jaunelacouleur@gmail.com',
			pass: '************'
		}
	});
	return {
		build: function (parameters) {
			return {
				get: function () {
					return {
						send: function (mail, next) {
							mail.from = from;
							smtpTransport.sendMail(mail, function(error, response){
								if(error) { return next(error); }
								next(null);

								// if you don't want to use this transport object anymore, uncomment following line
								// smtpTransport.close(); // shut down the connection pool, no more messages

								// res.send('Message sent: ' + response.message);
							});
						}
					};
				}
			};
		}
	};
});


kernel.
registerServiceFactory('input', function () {
	return {
		build: function (parameters) {

			if (parameters.length !== 1) {
				throw new TypeError('Use `input` expected one parameter.');
			}
			var definition = parameters[0];
			var type = typeof definition;
			if (type !== 'object') {
				throw new TypeError('`input` `input` expected one parameter, `object` exprected, given `'+type+'`.');
			}
			var values = {};

			return {
				'before-running#middlewares': [
					function (request, response, next) {
						var contenttype = request.headers['content-type'];
						var parserClassName = null;

						if (contenttype.match(/www-form/i)) {
							parserClassName = 'input.wwwform.Parser';
						}
/*
						if (contenttype.match(/json/i)) {
							parserClassName = 'input.json.Parser';
						}
						if (contenttype.match(/json/i)) {
							parserClassName = 'input.json.Parser';
						}
*/
						if (!parserClassName) {
							return next(new Error('Missing input parser for content type `'+contenttype+'`.'));
						}

						kernel.include(parserClassName);
						var parser = kernel.create(parserClassName);
						parser
							.on('error', function (error) {
								return next(error);
							})
							.on('end', function () {
								return next();
							})
							.on('input', function (name, value) {
								kernel.console('+++'+name+'+++');
								kernel.console(value);
							})
						;

						request
							.on('error', function (error) {
								return next(error);
							})
							.on('close', function () {
								kernel.console('+++close');
								return next(new Error('Closed...'));
							})
							.on('data', function (data) {

								kernel.console('+++data');
								kernel.console(data);

								parser.write(data);
							})
							.on('end', function () {
								kernel.console('+++end');
								parser.end();
							})
						;


/*
						Object.keys(definition).forEach(function (name) {
							var source = definition[name].source;

							kernel.console('+++'+name);
							kernel.console(source);
							kernel.console('---'+name);

							Object.defineProperty(values, name, {
								value: values[name],
								enumerable: true
							});
						});
*/

					}
				],
				get: function () {
					return values;
				}
			};
		}
	};
});


kernel.
registerServiceFactory('account.hasher', function () {
	var key = 'adrienasdasdasd';

	return {
		build: function (parameters) {
			return {
				get: function () {
					return {
						digest: function (mail) {
							var hasher = crypto.createHmac('sha1', key);
							hasher.update(mail);
							return hasher.digest('hex');
						},
						verify: function (mail, secret) {
							var hasher = crypto.createHmac('sha1', key);
							hasher.update(mail);
							return hasher.digest('hex') === secret;
						}
					};
				}
			};
		}
	};
});

kernel.
registerServiceFactory('template', function () {
	return {
		build: function (parameters) {
			var locals = {};
			return {
				'after-running#middlewares': [
					function (request, response, next) {
						var actionName = request.action_name;
						var actionNameClass = actionName+'.FrontAction';
						var templateName = actionName.replace(/\./g, '/');
						var requires = kernel.buildRequires(actionNameClass);

						response.render(templateName, locals, function(err, pageBody) {
							if (err) { return next(err); }

							response.render('page', {
								pageRequires: requires.map(function (require) {
									return '/source/'+require.replace(/\./g, '/')+'.js';
								}),
								pageBody: pageBody,
								pageCassName: actionNameClass
							}, function(err, html) {
								if (err) { return next(err); }
								response.send(html);
								next();
							});

						});
					}
				],
				get: function () {
					return {
						locals: function (l) {
							locals = l;
						},
						local: function (n, v) {
							locals[n] = v;
						}
					};
				}
			};
		}
	};
});


/**
 *
 */


var middleware_action = function (actionPrefix) {

	return function (req, res, next) {
		var actionName = req.params.action_name;
		var actionClassName = actionName+'.'+actionPrefix+'Action';

		kernel.include(actionClassName);

		req.action_name = actionName;
		req.action_prefix = actionPrefix;
		req.action_instance = kernel.create(actionClassName);
		req.action_classname = actionClassName;

		next();
	};
};


var middleware_run_action = function () {
	return function (req, res, next) {
		req.action_instance.run(function (error) {
			if (error) { return next(error); }
			next();
		});
	};
};




function middleware_service_run_middlewares (event) {
	return function(req, res, next) {
		var queue = new MiddlewareQueue();
		var action = req.action_instance;

		action.services.forEach(function (service) {
			var instance = service.instance;
			if (instance.hasOwnProperty(event+'#middlewares')) {
				instance[event+'#middlewares'].forEach(function (middleware) {
					queue.queue(middleware);
				});
			}
		});

		queue.execute(req, res, function (error) {
			if (error) { next(error); }
			next();
		});
	};
}

app.post('/action/:action_name/', [
	middleware_action('Append'),
	middleware_service_run_middlewares('before-running'),
	middleware_run_action(),
	middleware_service_run_middlewares('after-running')
], function(req, res) {
	kernel.console('done!');
});

app.get('/action/:action_name', [
	middleware_action('Display'),
	middleware_service_run_middlewares('before-running'),
	middleware_run_action(),
	middleware_service_run_middlewares('after-running')
], function(req, res) {
	kernel.console('done!');
});
/*
function render_template(res, locals, next) {
	var actionName = req.action_name;
	var actionNameClass = actionName+'.FrontAction';
	var requires = kernel.buildRequires(actionNameClass);
	var templateName = actionName.replace(/\./g, '/');

	res.render(templateName, locals, function(err, pageBody) {
		if (err) { next(err); return; }

		res.render('page', {
			pageRequires: requires.map(function (require) {
				return '/source/'+require.replace(/\./g, '/')+'.js';
			}),
			pageBody: pageBody,
			pageCassName: actionNameClass
		}, function(err, html) {
			if (err) { next(err); return; }
			res.send(html);
		});

	});
}
*/

app.listen(80);
console.log('Listening on port 80');
