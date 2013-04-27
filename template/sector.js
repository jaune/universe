

var player_id = '50ef3f86ed6253b412000002';


var specialize = function (superCtor, ctor) {
	ctor.super_ = superCtor;
	ctor.prototype = Object.create(superCtor.prototype, {
		constructor: {
			value: ctor,
			enumerable: false,
			writable: true,
			configurable: true
		}
	});
	return ctor;
};


var Item = function () {
};

Item.prototype.load = function (url, next) {
	$.getJSON(url, function (data, status, xhr) {
		if (!$.isPlainObject(data)) {
			next(new Error('Must be an Object `'+url+'`.'));
			return;
		}
		next(null, data);
	});
};

var Collection = function () {
};

Collection.prototype.load = function (url, next) {
	$.getJSON(url, function (data, status, xhr) {
		if (!$.isArray(data)) {
			next(new Error('Must be an Array `'+url+'`.'));
			return;
		}
		next(null, data);
	});
};

var Player = specialize(Item, function () {
	Item.call(this);
	this.id = null;
});

Player.prototype.load = function (next) {
	var url = '/players/'+this.id;
	var me = this;
	Item.load.call(this, function (err, data) {
		if (err) { next(err); return; }

		next(null, me);
	});
};

var Subsector = specialize(Item, function () {
	Item.call(this);
	this.y = null;
	this.x = null;
});


Player.Subsector = specialize(Subsector, function (player, x, y) {
	Subsector.call(this, x, y);
	this.player = player;
});

Player.Subsector.prototype.load = function (next) {
	var me = this;
	var url = '/players/'+me.player.id+'/subsectors/'+this.x+'/'+this.y;
	
	Subsector.load.call(url, function (err, data) {
		if (err) { next(err); return; }
		next(null, me);
	});
};



var Sector = function () {
	this.box = new THREE.Box2(new THREE.Vector2(), new THREE.Vector2());
	this.id = null;
	this.subsectors = {};
};


Sector.Subsector = specialize(Subsector, function (sector, x, y) {
	Subsector.call(this, x, y);
	this.sector = sector;
});


Sector.Subsector.prototype.load = function (next) {
	var me = this;
	var url = '/sectors/'+me.sector.id+'/subsectors/'+this.x+'/'+this.y;
	
	Subsector.load.call(url, function (err, data) {
		if (err) { next(err); return; }
		next(null, me);
	});
};

var u = {
	view: {}
};

u.view.Subsectors.prototype.loadSubsector = function (x, y, next) {
	var me = this;

	var s = new this.Subsector(this.ooo, x, y);
	s.load(function (err) {
		
		if (!$.isArray(subsector.systems)) {
			return;
		}
		


	});
};

u.view.Subsectors.prototype.unloadSubsector = function (x, y, next) {
	var key = x+':'+y;
	if (this.subsectors.hasOwnProperty(key)) {
		delete this.subsectors[key];
	}
};






var view = u.view;

view.Subsector.Subsector.SIZE = 800;

view.Subsector = specialize(THREE.Object3D, function () {
	THREE.Object3D.call(this);

	this.mBox = new THREE.Box2();
	this.mBox.expandByScalar(view.Subsector.Subsector.SIZE);


	this.mBounds = new THREE.Box2();
/*
	var view = new THREE.Object3D();
	view.position.x = x * Subsector.SIZE;
	view.position.z = y * Subsector.SIZE;
	this.view = view;

	model.load(function (err, model) {
		model.systems.forEach(function (system) {
			var particle = new THREE.Particle( systemMaterial );
			particle.position.x = system.x * Subsector.SIZE;
			particle.position.z = system.y * Subsector.SIZE;
			particle.scale.x = particle.scale.y = 0.1;
			this.view.add( particle );
		}, this);
	});
*/
});


view.Subsector.prototype.inBox = function (box) {
	return box.containsPoint(this.position);
};

view.Subsectors = specialize(THREE.Object3D, function () {
	THREE.Object3D.call(this);

	this.mSize = 5;
	this.mBox = new THREE.Box2();
	this.mBox.expandByScalar(view.Subsector.Subsector.SIZE * this.mSize);
	this.mCenter = new THREE.Vector2();
	this.mBounds = new THREE.Box2();

	this.mSubsectors = [];

	this.updateBounds();
});

view.Subsectors.prototype.updateBounds = function () {
	this.mBounds = this.mBox.clone().translate(this.mCenter);
	this.updateSubsectors();
};

view.Subsectors.prototype.updateSubsectors = function () {
	this.mSubsectors.forEach(function (subsector) {
		if (!subsector.inBox(this.mBounds)) {
			this.remove(subsector);
		}
	}, this);

	var i = Math.floor(this.mBounds.min.x);
	var il = Math.ceil(this.mBounds.max.x);

	var j = Math.floor(this.mBounds.min.y);
	var jl = Math.ceil(this.mBounds.max.y);

	for (; i < il; i++) {
		for (; j < jl; j++) {
		}
	}

};

view.Subsectors.prototype.setCenter = function (center) {
	if (this.mCenter.equals(center)) {
		return;
	}
	this.updateBounds();
};




var container, stats;
var camera, controls, scene, projector, renderer;
var text_overlay;

var systemTexture = new THREE.Texture();
var systemMaterial = new THREE.ParticleBasicMaterial({ map: systemTexture });

var totemTexture = new THREE.Texture();
var totemMaterial = new THREE.ParticleBasicMaterial({ map: totemTexture });

var sector = new Sector();

initTexture(systemTexture, '/asset/Icon_Art_v7_quote.png', function (err) {
	if (err) {
		throw new Error(err);
	}
	initTexture(totemTexture, '/asset/Tiki-Totems-2-icon.png', function (err) {
		if (err) {
			throw new Error(err);
		}
		init();
	});
});


function initTexture(texture, url, next) {
	var loader = new THREE.ImageLoader();
	loader.addEventListener('error', function ( event ) {
		next(event.message);
	});
	loader.addEventListener('load', function ( event ) {
		texture.image = event.content;
		texture.needsUpdate = true;
		next();
	});
	loader.load(url);
}

function init() {

	container = document.createElement( 'div' );

	var overlays = document.createElement( 'div' );
	overlays.setAttribute('class', 'overlays');

	text_overlay = document.createElement( 'div' );

	text_overlay.setAttribute('class', 'text-overlay');

	text_overlay.setAttribute('style', 'position: absolute; top: 0px; left: 0px;');

	overlays.appendChild(text_overlay);

	container.appendChild(overlays);

	document.body.appendChild( container );

	camera = new THREE.PerspectiveCamera( 70, window.innerWidth / window.innerHeight, 1, 10000 );
	camera.position.set( 0, 75, 125 );

	controls = new THREE.MyControls( camera );

	controls.minPolarAngle = 0; // radians
	controls.maxPolarAngle = Math.PI / 2.5; // radians

	controls.addEventListener( 'change', render );

	scene = new THREE.Scene();

	// var geometry = new THREE.CubeGeometry( 100, 100, 100 );

	// var geometry = new THREE.SphereGeometry(10);

	// var geometryLines = new THREE.Geometry();

/*
	for ( var i = 0; i < 10; i ++ ) {

		var system = new THREE.Particle( systemMaterial );
		system.position.x = Math.random() * 800 - 400;
		system.position.z = Math.random() * 800 - 400;
		system.scale.x = system.scale.y = 0.1;
		scene.add( system );

		systems.push(system);

		// geometryLines.vertices.push( object.position );

	}
*/

	// var line = new THREE.Line( geometryLines, new THREE.LineBasicMaterial( { linewidth : 5, color: 0xffffff, opacity: 0.5 } ) );
	// scene.add( line );

	projector = new THREE.Projector();

	
	renderer = new THREE.CanvasRenderer();

	renderer.setSize( window.innerWidth, window.innerHeight );

	container.appendChild( renderer.domElement );

	
	// document.addEventListener( 'mousedown', onDocumentMouseDown, false );

	renderer.domElement.addEventListener( 'click', onRendererClick, false );
	window.addEventListener( 'resize', onWindowResize, false );

	requestAnimationFrame( animate );

	loadPlayer(player_id, function (err, player) {
		if (err) { throw err; }

		loadArray('/sectors/', function (err, sectors) {
			if (err) { throw err; }
			console.debug(sectors);
		});

		sector.setPlayerId(player_id);

	});
}

function onWindowResize() {

	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();

	renderer.setSize( window.innerWidth, window.innerHeight );

}

function onRendererClick( event ) {
	var vector = new THREE.Vector3(
		( event.clientX / window.innerWidth ) * 2 - 1,
		- ( event.clientY / window.innerHeight ) * 2 + 1,
		0.5 );
	projector.unprojectVector( vector, camera );
	var ray = new THREE.Ray( camera.position, vector.subSelf( camera.position ).normalize() );

	var plane = new THREE.Plane(new THREE.Vector3( 0, 1, 0 ));
	var intersection = new THREE.Vector3();
	if (event.shiftKey && ray.intersectPlane(plane, intersection)) {
		

		var totem = new THREE.Particle( totemMaterial );
		totem.position.copy(intersection);
		totem.scale.x = totem.scale.y = 0.1;
		scene.add( totem );
	}
}




var subsectors = new u.view.Subsectors();

function animate() {

	requestAnimationFrame( animate );

	controls.update();

	// console.debug(controls);


	subsectors.setCenter(
		controls.center.x,
		controls.center.z
	);

	render();

}



var radius = 600;
var theta = 0;

function render() {
	theta += 0.2;

	renderer.render( scene, camera );
/*
	var vector = new THREE.Vector3();

	vector.copy(systems[0].position);
	projector.projectVector(vector, camera);

	var x = vector.x;
	var y = vector.y;

	var text_x = ((x + 1)/2) * window.innerWidth;
	var text_y = - ((y - 1)/2) * window.innerHeight;
	
	text_x -= 5;
	text_y -= 5;
	
	text_overlay.setAttribute('style', 'width: 10px; height: 10px; background-color: #f0f; position: absolute;'+
		'top: '+ text_y +'px;' +
		'left: '+ text_x +'px;');

*/
}