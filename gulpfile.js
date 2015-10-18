var gulp = require('gulp'),
	nodemon = require('gulp-nodemon');

gulp.task('default', ['nodemon']);

gulp.task('nodemon', function(cb) {
	nodemon({ script: './source/server.js' });
});