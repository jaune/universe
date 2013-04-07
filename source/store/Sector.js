kernel
.define('store.Sector')
.store('sectors')

.require()

/**
 *
 */
.construct(function () {
})


/**
 *
 */
.service('mongodb', ['sectors'])
.service('store', ['subsectors'])
.property('create', function (name, next) {
	var services = this.services;

	services.mongodb('sectors').insert({}, function (err, sectors) {
		if (err) { next(err); return; }
		var sector = sectors[0];
		services.store('subsectors').create(sector._id, [{x: 0, y: 0}], function (err, subsector) {
			next(null, sector, subsector);
		});
	});
})



/**
 *
 */
.service('mongodb', ['sectors', 'subsectors'])
.service('store', ['subsectors'])
.property('discover', function (sector_id, x, y, radius, next) {
	var services = this.services;

	var min_x = Math.floor(x - radius);
	var min_y = Math.floor(y - radius);

	var max_x = Math.ceil(y + radius);
	var max_y = Math.ceil(x + radius);

	var query = {
		x: [{$gt : min_x - 1}, {$lt : max_x + 1}],
		y: [{$gt : min_y - 1}, {$lt : max_y + 1}],
		sector_id: sector_id
	};

	services.mongodb('subsectors').find(query, function (err, subsectors) {
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

		services.store('subsectors').create(sector_id, new_subsectors, function (err, new_subsectors) {
			if (err) { next(err); return; }

			next(null, new_subsectors.concat(subsectors));
		});
	});
})

;
