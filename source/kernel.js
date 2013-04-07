(function (root) {

	/**
	 *
	 */
	var Definition = function () {
		this.methods = {};
		this.method_construct = null;
		this.requires = [];
	};

	Definition.prototype.property = function (name, closure) {
		this.methods[name] = closure;
		return this;
	};

	Definition.prototype.construct = function (closure) {
		if (this.method_construct !== null) {
			throw 'Construct already define.';
		}
		this.method_construct = closure;
		return this;
	};

	Definition.prototype.require = function () {
		var requires = this.requires;
		var i = 0, l = arguments.length;
		for (; i < l; i++) {
			if (typeof arguments[i] !== 'string') {
				throw new Error('Requires must be a `string`.');
			}
			requires.push(arguments[i]);
		}
		return this;
	};

	/**
	 *
	 */
	var AbstractKernel = function () {
		this.definitions = {};
		this.objects = {};
	};

	// Object.defineProperties(Kernel.prototype, {
	// script: {
	//		get: function () {
	//			this.beginScript();
	//			return this;
	//		},
	//		set: function () {
	//		}
	//	}
	// });

	// Kernel.prototype.beginScript = function () {
	// };

	AbstractKernel.prototype.define = function (name) {
		var d = new Definition(name);

		this.definitions[name] = d;
		return d;
	};

	AbstractKernel.prototype.console = function () {
		if (typeof console.debug === 'function') {
			console.debug.apply(console, arguments);
			return;
		}
		if (typeof console.dir === 'function') {
			console.dir.apply(console, arguments);
			return;
		}
		if (typeof console.log === 'function') {
			console.log.apply(console, arguments);
			return;
		}
	};

	AbstractKernel.prototype.include = function (name) {
		throw new TypeError('AbstractKernel#include is abstract.');
	};

	AbstractKernel.prototype.create = function (name, parameters) {
		if (!this.definitions.hasOwnProperty(name)) {
			throw new TypeError('Missing define `'+name+'`.');
		}
		if (!this.objects.hasOwnProperty(name)) {
			var definition = this.definitions[name],
				object = definition.method_construct;

			object.prototype = Object.create(Object.prototype);
			Object.keys(definition.methods).forEach(function (key) {
				object.prototype[key] = definition.methods[key];
			});

			this.objects[name] = object;
		}
		return new this.objects[name](parameters);
	};

	/**
	 *
	 */
	var NodeKernel = function () {
		AbstractKernel.apply(this, arguments);

		this.modules = {
			vm: require('vm'),
			fs: require('fs')
		};
	};

	NodeKernel.prototype = new AbstractKernel();

	NodeKernel.prototype.runClassCode = function (name, sandbox) {
		var filename = __dirname+'/'+name.replace('.', '/')+'.js';
		var code = this.modules.fs.readFileSync(filename);
		this.modules.vm.runInNewContext(code, sandbox, filename);
		return sandbox;
	};

	NodeKernel.prototype.include = function (name) {
		var requires = this.buildRequires(name);
		requires.forEach(function (require) {
			if (!this.definitions.hasOwnProperty(require)) {
				var sandbox = {
					kernel: this
				};
				this.runClassCode(name, sandbox);
			}
		}, this);
	};

	NodeKernel.prototype.buildRequires = function (name) {
		var require_name = null;
		var requires = [];
		var stack = [];
		var pushInStack = function (require) {
			stack.push(require);
		};

		this.requestRequires(name).forEach(pushInStack);

		while (stack.length > 0) {
			require_name = stack.pop();
			if (requires.indexOf(require_name) === -1) {
				requires.push(require_name);
				this.requestRequires(require_name).forEach(pushInStack);
			}
		}
		return requires;
	};

	NodeKernel.prototype.requestRequires = function (name) {
		var fake = new NodeFakeKernel();
		var sandbox = {
			kernel: fake
		};
		this.runClassCode(name, sandbox);
		return fake.requires;
	};


	/**
	 *
	 */
	var NodeFakeKernel = function () {
		this.modules = {
			vm: require('vm'),
			fs: require('fs')
		};
		this.requires = [];
	};

	NodeFakeKernel.prototype.define = function (name) {
		this.requires.push(name);
		return new NodeFakeDefinition(this);
	};

	/**
	 *
	 */
	var NodeFakeDefinition = function (fake) {
		this.fake = fake;
	};

	NodeFakeDefinition.prototype.property = function () {
		return this;
	};

	NodeFakeDefinition.prototype.construct = function () {
		return this;
	};

	NodeFakeDefinition.prototype.require = function () {
		var requires = this.fake.requires;
		var i = 0, l = arguments.length;
		for (; i < l; i++) {
			if (typeof arguments[i] !== 'string') {
				throw new Error('Requires must be a `string`.');
			}
			requires.push(arguments[i]);
		}
		return this;
	};



	/**
	 *
	 */
	var BrowserKernel = function () {
		AbstractKernel.apply(this, arguments);

		this.loading = 0;
	};

	BrowserKernel.prototype = new AbstractKernel();

	/**
	 *
	 */
	if (root.hasOwnProperty('window') || typeof root.window === 'object') {
		window.kernel = new BrowserKernel();
		return;
	} else {
		exports.Kernel = NodeKernel;
	}
})(this);
