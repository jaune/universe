(function (root) {

	/**
	 *
	 */
	var UseDefinition = function (name) {
		this.mName = name;
		this.mParameters = [];
	};

	UseDefinition.prototype.pushParameter = function (parameter) {
		this.mParameters.push(parameter);
	};

	/**
	 *
	 */
	var MethodDefinition = function (name, closure) {
		this.mName = name;
		this.mClosure = closure;
	};

	/**
	 *
	 */
	var Definition = function (name) {
		this.mName = name;
		this.mRequires = [];
		this.mMethods = [];
		this.mUses = [];
	};

	Definition.prototype.use = function () {
		var l = arguments.length;
		if (l < 1) {
			throw new Error('use must have minimum one argument.');
		}
		var name = arguments[0];
		var i = 1, u = new UseDefinition(name);
		for (; i < l; i++) {
			u.pushParameter(arguments[i]);
		}
		this.mUses.push(u);
		return this;
	};

	Definition.prototype.property = function (name, closure) {
		if (typeof closure === 'function') {
			this.mMethods.push(new MethodDefinition(name, closure));
		} else {
			throw new Error('Unsupported');
		}
		return this;
	};

	Definition.prototype.require = function () {
		var requires = this.mRequires;
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
		this.mDefinitions = {};
		this.mObjects = {};


		this.mServiceFactories = {};
	};

	AbstractKernel.prototype.define = function (name) {
		var d = new Definition(name);

		this.mDefinitions[name] = d;

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

	AbstractKernel.prototype.hasDefinition = function (name) {
		return this.mDefinitions.hasOwnProperty(name);
	};

	AbstractKernel.prototype.getServiceFactoryInstance = function (name) {
		if (!this.mServiceFactories.hasOwnProperty(name)) {
			throw new Error('Unregistered service factory `'+name+'`.');
		}
		var factory = this.mServiceFactories[name];
		if (factory.instance) {
			return factory.instance;
		}
		
		var type = typeof factory.builder;
		var instance = null;
		switch (type) {
			case 'function':
					instance = factory.builder();
				break;
			case 'string':
					throw new Error('Unsupported yet !');
				break;
			default:
				throw new Error('Wrong factory builder type `'+type+'`.');
		}
		return factory.instance = instance;
	};

	AbstractKernel.prototype.registerServiceFactory = function (name, builder) {
		this.mServiceFactories[name] = {
			instance: null,
			builder: builder
		};
	};

	AbstractKernel.prototype.create = function (name, parameters) {
		if (!this.hasDefinition(name)) {
			throw new TypeError('Missing define `'+name+'`.');
		}
		if (!this.mObjects.hasOwnProperty(name)) {

			var k = this,
				definition = this.mDefinitions[name],
				object = function () { };

			object.prototype = Object.create(Object.prototype);

			var services = [];
			definition.mUses.forEach(function (use) {
				var name = use.mName;
				var alias = name;
				var names = name.split('@', 2);
				if (names.length === 2) {
					name = names[0];
					alias = names[1];
				}
				var useParameters = use.mParameters;
				var service = k.getServiceFactoryInstance(name).build(useParameters);
				services.push({
					name: name,
					parameters: useParameters,
					instance: service
				});
				Object.defineProperty(object.prototype, alias, { 
					get : function () { return service.get(); },
					set : function (value) { return service.set(value); }
				});
			});
			Object.defineProperty(object.prototype, 'services', { value : services } );		

			definition.mMethods.forEach(function (method) {
				Object.defineProperty(object.prototype, method.mName, {value : method.mClosure, enumerable: true } );
			});

			this.mObjects[name] = object;
		}
		return new this.mObjects[name](parameters);
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
		var filename = __dirname+'/'+name.replace(/\./g, '/')+'.js';
		var code = this.modules.fs.readFileSync(filename);
		try {
			this.modules.vm.runInNewContext(code, sandbox, filename);	
		} catch (error) {
			throw TypeError('`'+filename+'`\n'+error.message);
		}
		return sandbox;
	};

	NodeKernel.prototype.include = function (name) {
		var requires = this.buildRequires(name);
		requires.forEach(function (require) {
			if (!this.mDefinitions.hasOwnProperty(require)) {
				var sandbox = {
					kernel: this
				};
				this.runClassCode(name, sandbox);
			}
		}, this);
	};

	NodeKernel.prototype.buildRequires = function () {
		var require_name = null;
		var requires = [];
		var stack = [];
		var pushInStack = function (require) {
			stack.push(require);
		};

		for (i = 0, l = arguments.length; i < l; i++) {
			this.requestRequires(arguments[i]).forEach(pushInStack);
		}

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

	NodeFakeDefinition.prototype.use = function () {
		return this;
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
	if (typeof root.window === 'object') {
		window.kernel = new BrowserKernel();
		return;
	} else {
		exports.Kernel = NodeKernel;
	}


})(this);
