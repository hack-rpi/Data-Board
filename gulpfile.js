const child = require('child_process');
const gulp = require('gulp');
const less = require('gulp-less');
const path = require('path');
const util = require('gulp-util');

var server;

gulp.task('default', ['go', 'watch']);
gulp.task('watch', ['watch:less', 'watch:go']);

gulp.task('watch:go', function() {
  gulp.watch(['./**/*.go'], ['go']);
});

gulp.task('go', function() {
  if (server) {
    server.kill();
  }
  server = child.spawn('go', ['run', 'main.go']);
  /* Pretty print server log output */
  server.stdout.on('data', function(data) {
    var lines = data.toString().split('\n')
    for (var l in lines)
      if (lines[l].length)
        util.log(lines[l]);
  });
  /* Print errors to stdout */
  server.stderr.on('data', function(data) {
    process.stdout.write(data.toString());
  });
});

gulp.task('watch:less', function() {
  gulp.watch(['./static/style/*.less'], ['less']);
});

gulp.task('less', function() {
  return gulp.src('./static/style/*.less')
    .pipe(less({
      paths: [ path.join(__dirname, 'less', 'includes') ]
    }))
    .pipe(gulp.dest('./static/style'));
});
