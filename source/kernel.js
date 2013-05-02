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

	MethodDefinition.prototype.mName = null;
	MethodDefinition.prototype.mClosure = null;

	/**
	 *
	 */
	var AttributeDefinition = function (name, value) {
		this.mName = name;
		this.mValue = value;
	};

	AttributeDefinition.prototype.mName = null;
	AttributeDefinition.prototype.mValue = null;

	/**
	 *
	 */
	var Definition = function (name) {
		this.mName = name;
		this.mRequires = [];
		this.mMethods = [];
		this.mUses = [];
		this.mAttributes = [];
	};

	Definition.prototype.mName = null;
	Definition.prototype.mParent = null;
	Definition.prototype.mRequires = null;
	Definition.prototype.mMethods = null;
	Definition.prototype.mAttributes = null;
	Definition.prototype.mUses = null;
	Definition.prototype.mConstructor = null;

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

	Definition.prototype.method = function (name, closure) {
		if (typeof closure === 'function') {
			this.mMethods.push(new MethodDefinition(name, closure));
		} else {
			throw new Error('Unsupported');
		}
		return this;
	};

	Definition.prototype.constructor = function (closure) {
		if (this.mConstructor) {
			throw new TypeError('Constructor already defined.');
		}
		this.mConstructor = closure;
		return this;
	};

	Definition.prototype.attribute = function (name, value) {
		this.mAttributes.push(new AttributeDefinition(name, value));
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

	Definition.prototype.inherits = function (parent) {
		this.mParent = parent;
		return this;
	};

	/**
	 *
	 */
	var AbstractKernel = function () {
		this.mDefinitions = {};
		this.mConstructors = {};
		this.mServiceFactories = {};
	};

	AbstractKernel.prototype.mDefinitions = null;
	AbstractKernel.prototype.mConstructors = null;
	AbstractKernel.prototype.mServiceFactories = null;

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

	AbstractKernel.prototype.getDefinition = function (name) {
		if (!this.hasDefinition(name)) {
			throw new TypeError('Missing definition `'+name+'`.');
		}
		return this.mDefinitions[name];
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
			default:
				throw new Error('Wrong factory builder type `'+type+'`.');
		}
		factory.instance = instance;
		return instance;
	};

	AbstractKernel.prototype.registerServiceFactory = function (name, builder) {
		this.mServiceFactories[name] = {
			instance: null,
			builder: builder
		};
	};

	AbstractKernel.prototype.callConstructor = function (name, target, parameters) {
		this.getConstructor(name).apply(target, parameters);
	};

	AbstractKernel.prototype.buildConstructor = function (definition) {
		var constructor = definition.mConstructor,
			parentPrototype = Object.prototype,
			properties = {
				'~name': { value: definition.mName }
			},
			parentName = definition.mParent || null,
			parentDefinition = null;

		if (parentName) {
			parentDefinition =  this.getDefinition(parentName);
			parentPrototype = this.getConstructor(parentName).prototype;

			if (!constructor) {
				constructor = parentDefinition.mConstructor;
			}
		}

		constructor = constructor || function () { };

		definition.mAttributes.forEach(function (attribute) {
			properties[attribute.mName] = {
				value: null,
				writable: true,
				enumerable: true
			};
		}, this);

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
			var service = this.getServiceFactoryInstance(name).build(useParameters);
			services.push({
				name: name,
				parameters: useParameters,
				instance: service
			});
			properties[alias] = {
				get : function () { return service.get(); },
				set : function (value) { return service.set(value); }
			};
		}, this);
		properties['services'] = { value : services };

		if (parentDefinition) {
			parentDefinition.mMethods.forEach(function (method) {
				properties[method.mName] = {value : method.mClosure, enumerable: true };
			}, this);
		}

		definition.mMethods.forEach(function (method) {
			properties[method.mName] = {value : method.mClosure, enumerable: true };
		}, this);

		constructor.prototype = Object.create(parentPrototype, properties);

		return constructor;

	};

	AbstractKernel.prototype.getConstructor = function (name) {
		var definition = this.getDefinition(name);
		if (!this.mConstructors.hasOwnProperty(name)) {
			this.mConstructors[name] = this.buildConstructor(definition);
		}
		return this.mConstructors[name];
	};

	AbstractKernel.prototype.create = function (name, parameters) {
		var constructor = this.getConstructor(name);

		return new constructor(parameters);
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
			throw new TypeError('`'+filename+'`\n'+error.message);
		}
	};

	NodeKernel.prototype.include = function (name) {
		var requires = this.buildRequires(name);

		requires.forEach(function (require) {
			this.includeOnce(require);
		}, this);
	};

	NodeKernel.prototype.includeOnce = function (name) {
		if (this.hasDefinition(name)) {
			return;
		}

		var sandbox = {
			kernel: this
		};
		this.runClassCode(name, sandbox);

		if (!this.hasDefinition(name)) {
			throw new Error('Missing definition `'+name+'` after including.');
		}
	};

	NodeKernel.prototype.buildRequires = function () {
		var require_name = null,
			requires = [],
			stack = [],
			pushInStack = function (require) {
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

	NodeFakeDefinition.prototype.inherits = function (parent) {
		this.fake.requires.push(parent);
		return this;
	};

	NodeFakeDefinition.prototype.method = function () {
		return this;
	};

	NodeFakeDefinition.prototype.attribute = function () {
		return this;
	};

	NodeFakeDefinition.prototype.constructor = function () {
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
