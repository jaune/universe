kernel
.define('store.Player.Subsectors')
.store('players.subsectors')

.require()

/**
 *
 */
.construct(function () {
})

.service('mongodb', ['subsectors'])
.property('create', function (player, subsector, systems, next) {
	var data = {
		x: subsector.x + player.sector_offset_x,
		y: subsector.y + player.sector_offset_y,
		player_id: player._id,
		subsector_id: subsector._id,
		systems: systems
	};
	services.mongodb('players.subsectors').insert(data, function (err, subsectors) {
		if (err) { next(err); return; }

		next(null, subsectors[0]);
	});
})

;
