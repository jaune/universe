kernel
.define('store.Player')
.store('players')

.require(
)

/**
 *
 */
.construct(function () {
})


/**
 *
 */
.use('mongodb', ['players'])
.use('store', ['sectors'])
.property('create', function (name, next) {
	var services = this.services;

	services.store('sectors').create(function (err, sector, subsector) {
		if (err) { next(err); return; }

		services.mongodb('players').insert({
			sector_id: sector._id,
			sector_offset_x: 0,
			sector_offset_y: 0,
			name: name
		}, function (err, players) {
			if (err) { next(err); return; }
			var player = players[0];

			var system_index = Math.round(Math.random() * (subsector.systems.length - 1));
			var system = subsector.systems[system_index];
			var x = subsector.x + system.x;
			var y = subsector.y + system.y;

			var radius = 0.75;
			services.store('sectors').discover(sector._id, x, y, radius, function (err, subsectors) {
				if (err) { next(err); return; }

				var systems = [{
					index: system_index
				}];
				services.store('players.subsectors').create(player, subsector, systems, function (err, subsectors) {
					if (err) { next(err); return; }
					next(null, player);
				});
			});
		});

	});
})

;
