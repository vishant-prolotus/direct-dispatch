var gulp = require('gulp'),
	fileinclude = require('gulp-file-include');

gulp.task('include', function () {
	gulp.src('pages/*.html')
		.pipe(fileinclude({ indent: true }))
		.pipe(gulp.dest('./'));

	gulp.src('pages/services/*.html')
		.pipe(fileinclude({ indent: true }))
		.pipe(gulp.dest('./services/'));
		
	gulp.src('shipper/app/src/*.html')
		.pipe(fileinclude({ indent: true, basepath: '@root' }))
		.pipe(gulp.dest('shipper/app/'));
});

gulp.watch(['pages/*.html', 'pages/services/*.html', 'pages/includes/*.html', 'shipper/app/src/*.html'], ['include']);