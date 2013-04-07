kernel
.define('store.Subsectors')
.store('subsectors')

.require()

/**
 *
 */
.construct(function () {
})


.property('generate', function (sector_id, x, y) {
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
})

.property('create', function (sector_id, xy, next) {
	var me = this;	
	var subsectors = xy.map(function (subsector) {
		return me.generate(sector_id, subsector.x, subsector.y);
	});
	db.subsectors.insert(subsectors, function (err, subsectors) {
		if (err) { next(err); return; }

		next(null, subsectors);
	});
})

;
