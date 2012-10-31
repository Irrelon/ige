var fs = require('fs'),
	exec = require('child_process').exec,
	dir = '../ige_prototype/examples/',
	data = {};

fs.readdir(dir, function(err, files){
	if (err) { throw(err); }

	files.forEach(function(file){
		console.log('Reading ' + dir + file);
		fs.stat(dir + file, function(err, stats){
			if (err) { throw(err); }

			if (stats.isDirectory()) {
				// Check if the directory has a ClientConfig.js file
				// so we know it's a game folder
				fs.stat(dir + file + '/ClientConfig.js', function (err, ccStat) {
					if (!err) {
						// Folder is a game folder
						console.log('Processing ' + file + '...');
						var child = exec('node ./server/ige -fixPaths true -index true -deploy ' + dir + file, {cwd: process.cwd()}, function (error, stdout, stderr) {
							console.log('Deploy to ' + file + ' complete');
						});
					}
				});
			}

		});
	});
});