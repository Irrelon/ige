var IgeTest = IgeClass.extend({
	classId: 'IgeTest',

	init: function () {

	},

	run: function () {
		var testCount,
			iterate,
			st,
			dt,
			results,
			local;

		// Test speed of cached access vs global access
		iterate = 6;
		results = [];

		while (iterate--) {
			testCount = 1000000;
			st = new Date().getTime();
			while (testCount--) {
				this.ige._testValue = 'hello';
			}
			dt = new Date().getTime() - st;
			results.push(dt);
		}

		console.log('Cached "this" accessor: ' + this._averageArray(results) + 'ms');

		iterate = 6;
		results = [];
		local = this.ige;

		while (iterate--) {
			testCount = 1000000;
			st = new Date().getTime();
			while (testCount--) {
				local._testValue = 'hello';
			}
			dt = new Date().getTime() - st;
			results.push(dt);
		}

		console.log('Cached local accessor: ' + this._averageArray(results) + 'ms');

		iterate = 6;
		results = [];

		while (iterate--) {
			testCount = 1000000;
			st = new Date().getTime();
			while (testCount--) {
				ige._testValue = 'hello';
			}
			dt = new Date().getTime() - st;
			results.push(dt);
		}


		console.log('Uncached global accessor: ' + this._averageArray(results) + 'ms');
	},

	_averageArray: function (arr) {
		var total = 0,
			i;

		for (i in arr) {
			total += arr[i];
		}

		return total / arr.length;
	}
});