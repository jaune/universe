var express = require('express');
var app = express();
var mongojs = require('mongojs');
var schemas = require('schema')('schemas');

var ObjectId = mongojs.ObjectId;

var db = mongojs.connect('mydb', [
	'players',
	'totems',
	'systems',
	
	'sectors',
	'subsectors',
	'subsectors_via_player'
]);


function validate_json_body (description) {
	var schema = schemas.Schema.create(description);
	return function (req, res, next) {
		var validation = schema.validate(req.body);
		if (validation.isError()) {
			next(new Error('Invalid input.'));
		} else {
			next();
		}
	};
}

app.configure(function () {
	app.use(express['static'](__dirname));
	app.use(app.router);
	app.use(function (err, req, res, next) {
		console.error(err.stack);
		res.send(500, 'Sorry something bad happened!');
	});
});



var Player = {};

Player.create = function (name, next) {
	Sector.create(function (err, sector) {
		if (err) { next(err); return; }
		db.players.insert({
			sector_id: sector._id,
			sector_offset_x: 0,
			sector_offset_y: 0,
			name: name
		}, function (err, players) {
			if (err) { next(err); return; }
			var player = players[0];
			Subsector.create(sector._id, 0, 0, function (err, subsector) {
				if (err) { next(err); return; }

				var system_index = Math.round(Math.random() * (subsector.systems.length - 1));
				var system = subsector.systems[system_index];
				var x = subsector.x + system.x;
				var y = subsector.y + system.y;

				var radius = 0.75;
				Sector.discover(sector, x, y, radius, function (err, subsectors) {
					if (err) { next(err); return; }

					var systems = [{
						index: system_index
					}];
					PlayerSubsector.create(player, subsector, systems, function (err, subsector_via_player) {
						if (err) { next(err); return; }
							next(null, player);
					});
				});
			});
		});
	});
};


/*
var Totem = {};

Totem.create = function (owner_id, subsector_id, system_index, next) {
	var radius = 1.75;
	Subsector.discoverByID(subsector_id, system_index, radius, function (err, subsectors) {
		var totem = {
			owner_id: owner_id,
			subsector_id: subsector_id,
			system_index: system_index,
			systems: []
		};
		db.totems.insert(totem, function (err, totem) {
			if (err) { next(err); return; }
			next(null, totem);
		});
	});
};
*/

var Sector = {};

Sector.create = function (next) {
	var sector = {
	};
	db.sectors.insert(sector, function (err, sector) {
		if (err) { next(err); return; }
		next(null, sector[0]);
	});
};

Sector.discover = function (sector_id, x, y, radius, next) {
	var min_x = Math.floor(x - radius);
	var min_y = Math.floor(y - radius);
	
	var max_x = Math.ceil(y + radius);
	var max_y = Math.ceil(x + radius);

	var query = {
		x: [{$gt : min_x - 1}, {$lt : max_x + 1}],
		y: [{$gt : min_y - 1}, {$lt : max_y + 1}],
		sector_id: sector_id
	};

	db.subsectors.find(query, function (err, subsectors) {
		if (err) { next(err); return; }

		var old_subsectors = {};
		var new_subsectors = [];

		subsectors.forEach(function (subsector) {
			old_subsectors[subsector.x+':'+subsector.y] = subsector;
		});

		var i, j, k;
		for (i = min_x; i <= max_x; i++) {
			for (j = min_y; j <= max_y; j++) {
				k = i+':'+j;
				if (!old_subsectors.hasOwnProperty(k)) {
					new_subsectors.push({
						x: i,
						y: j
					});
				}
			}
		}

		Subsectors.create(sector_id, new_subsectors, function (err, new_subsectors) {
			if (err) { next(err); return; }
			
			next(null, new_subsectors.concat(subsectors));
		});
	});

/*
	var i = Math.min(min_x, sector.min_x);
	var limit_i = Math.max(max_x, sector.max_x);

	var j = Math.max(max_y, sector.max_y);
	var limit_j = Math.max(max_y, sector.max_y);

	var newSubsectors = [];
	var oldSubsectors = [];

	for (; i <= limit_i; i++) {
		for (; j <= limit_j; j++) {
			if ( ( sector.min_x <= i ) && ( i <= sector.max_x ) && ( sector.min_y <= j ) && ( j <= sector.max_y ) ) {
				oldSubsectors.push({
					x: i,
					y: j
				});
			} else {
				newSubsectors.push({
					x: i,
					y: j
				});
			}
		}
	}

	sector.min_x = i;
	sector.min_y = j;
	sector.max_x = limit_i;
	sector.max_y = limit_j;
	db.sectors.update(sector, function () {
		if (err) { next(err); return; }
		next(null, subsectors);
	});
*/
};
/*
				PlayerSubsector.create(subsector._id, player._id, 0, 0, function (err, subsector_via_player) {
					if (err) { next(err); return; }

					Sector.discover(sector._id, function (err) {
						next(null, player);
					});
				});
*/
/*
Sector.discoverByObject = function (sector, subsector, system_index, radius, next) {
	var system = subsector.systems[system_index];

	var x = system.x;
	var y = system.y;

	var north = Math.ceil((y + radius) - 1.0);
	var east = Math.ceil((x + radius) - 1.0);
	var south = Math.abs(Math.floor(y - radius));
	var west = Math.abs(Math.floor(x - radius));

	console.log(north);
	console.log(east);
	console.log(south);
	console.log(west);

	next(null, sectors);
};

Sector.discoverByID = function (sector_id, subsector, system_index, radius, next) {
	var query = {
		_id: sector_id
	};
	db.sectors.find(query, function (err, sectors) {
		if (err) { next(err); return; }
		if (sectors.length !== 1) {
			next(new Error('Indalid sector id.'));
			return;
		}
		Sector.discoverByObject(sectors[0], subsector, system_index, radius, next);
	});
};
*/

var Subsectors = {};

Subsectors.create = function (sector_id, xy, next) {
	var subsectors = xy.map(function (subsector) {
		return Subsector.generate$(sector_id, subsector.x, subsector.y);
	});
	db.subsectors.insert(subsectors, function (err, subsectors) {
		if (err) { next(err); return; }
		next(null, subsectors);
	});
};




var Subsector = {};

Subsector.generate$ = function (sector_id, x, y) {
	var systems = [];
	var i = 0, l = 1 + Math.round(Math.random() * 14);
	for (; i < l; i++) {
		systems.push({
			x: Math.random(),
			y: Math.random()
		});
	}
	return {
		x: x,
		y: y,
		sector_id: sector_id,
		systems: systems
	};
};

Subsector.create = function (sector_id, x, y, next) {
	var subsector = Subsector.generate$(sector_id, x, y);
	db.subsectors.insert(subsector, function (err, subsectors) {
		if (err) { next(err); return; }
		next(null, subsectors[0]);
	});
};
/*

Subsector.discoverByID = function (subsector_id, system_index, radius, next) {
	var query = {
		_id: subsector_id
	};
	db.subsectors.find(query, function (err, subsectors) {
		if (err) { next(err); return; }
		if (subsectors.length !== 1) {
			next(new Error('Indalid sector id.'));
			return;
		}
		Subsector.discoverByObject(subsectors[0], system_index, radius, next);
	});
};

Subsector.discoverByObject = function (subsector, system_index, radius, next) {
	Sector.discoverByID(subsector.sector_id, subsector, system_index. radius, next);
};
*/


function findPlayer(player_id, next) {
	var query = {
		_id: player_id
	};
	db.players.find(query, function (err, players) {
		if (err) {
			next(err);
			return;
		}
		if (players.length !== 1) {
			next(new Error('Invalid id.'));
			return;
		}
		next(null, players[0]);
	});
}

/*
function findPlayerTotems(player_id, next) {
	var query = {
		owner: player_id
	};
	db.totems.find(query, function (err, totems) {
		if (err) {
			next(err);
			return;
		}
		next(null, totems);
	});
}

function findPlayerSectorSystems(player_id, sector_id, next) {
	var query = {
		owner: player_id,
		sectors: sector_id
	};
	db.totems.find(query, function (err, totems) {
		if (err) { next(err); return; }
		var query = {
			sector: sector_id
		};
		db.systems.find(query, function (err, systems) {
			if (err) { next(err); return; }

			var sector_systems = [];

			totems.forEach(function (totem) {
				totem.systems.forEach(function (system) {
					
					sector_systems.push({});

				});
			});

			next(null, sector_systems);
		});
	});
}
*/

app.get('/players/:player_id', function(req, res, next) {
	var player_id = ObjectId(req.params.player_id);

	findPlayer(player_id, function (err, player) {
		if (err) { next(err); return; }
		res.send(player);
	});
});
/*
app.get('/players/:player_id/totems/', function(req, res, next){
	var player_id = ObjectId(req.params.player_id);

	findPlayerTotems(player_id, function (err, totems) {
		if (err) { next(err); return; }
		res.send(totems);
	});
});
*/


app.get('/players/:player_id/subsectors/:subsector_x/:subsector_y', function(req, res, next){
	var player_id = ObjectId(req.params.player_id);
	var subsector_x = 1 * req.params.subsector_x;
	var subsector_y = 1 * req.params.subsector_y;
/*
	var systems = [];
	for ( var i = 0; i < 10; i ++ ) {
		systems.push({
			index: i,
			x: Math.random() - 0.5,
			y: Math.random() - 0.5
		});
	}
*/

	PlayerSubsector.find(player_id, subsector_x, subsector_y, function (err, subsector) {
		if (err) { next(err); return; }
		res.send(subsector);
	});

});

var PlayerSubsector = {};

PlayerSubsector.create = function (player, subsector, systems, next) {
	var subsector_via_player = {
		x: subsector.x + player.sector_offset_x,
		y: subsector.y + player.sector_offset_y,
		player_id: player._id,
		subsector_id: subsector._id,
		systems: systems
	};
	db.subsectors_via_player.insert(subsector_via_player, function (err, subsectors) {
		if (err) { next(err); return; }
		next(null, subsectors[0]);
	});
};

PlayerSubsector.find = function (player_id, x, y, next) {
	PlayerSubsector.findSystems(player_id, x, y, function (err, systems) {
		if (err) { next(err); return; }
		next(null, {
			x: x,
			y: y,
			player_id: player_id,
			systems: systems
		});
	});
};

PlayerSubsector.findSystems = function (player_id, x, y, next) {
	var query = {
		player_id: player_id,
		x: x,
		y: y
	};
	db.subsectors_via_player.find(query, function (err, subsectors) {
		if (err) { next(err); return; }
		if (subsectors.length === 0) {
			next(null, []);
			return;
		}
		var subsector_via_player = subsectors[0];
		var query = {
			_id: subsector_via_player.subsector_id
		};
		db.subsectors.find(query, function (err, subsectors) {
			if (err) { next(err); return; }
			if (subsectors.length !== 1) { next(new Error('Invalid id.')); return; }
			var subsector = subsectors[0];
			var systems = [];

			subsector_via_player.systems.forEach(function (system_via_player) {
				var system = subsector.systems[system_via_player.index];
				this.push({
					index: system_via_player.index,
					x: system.x,
					y: system.y
				});
			}, systems);
			
			next(null, systems);
		});
	});
};


app.post('/players/', [express.json(), validate_json_body({
	type: 'object',
	properties: {
		'name': {
			'type': 'string',
			'minLength': 3,
			'maxLength': 64,
			'required': true
		}
	},
	additionalProperties: false
})], function(req, res, next) {
	Player.create(req.body.name, function (err, player) {
		if (err) { next(err); return; }
		res.send(player);
	});
});



app.listen(80);
console.log('Listening on port 80');
