 /*
 * vscode-gulpfile.js
 *
 * Copyright (c) 2016, 2017 Jan T. Sott
 * Licensed under the MIT license.
 */
const meta = require('./package.json');

// Dependencies
const gulp = require('gulp');

const argv = require('yargs').argv;
const concat = require('gulp-concat');
const debug = require('gulp-debug');
const handlebars = require('handlebars');
const htmlmin = require('gulp-htmlmin');
const tap = require('gulp-tap');
const uglify = require('gulp-uglify');
// const notify = require('gulp-notify');
const markdown = require('gulp-markdown');
const path = require('path');
const fs = require('fs');

var partialsDir = __dirname + '/src/views/partials';
var filenames = fs.readdirSync(partialsDir);

filenames.forEach(function (filename) {
  var matches = /^([^.]+).hbs$/.exec(filename);
  if (!matches) {
    return;
  }
  var name = matches[1];
  var template = fs.readFileSync(partialsDir + '/' + filename, 'utf8');
  handlebars.registerPartial(name, template);
});


let minifyHtml = true;
if (argv.minify == 'false') {
    minifyHtml = false;
}

// Supported files
const docMarkdown = [
    '!node_modules/nsis-docs/Plugins/*.md',
    '!node_modules/nsis-docs/README.md',
    'node_modules/nsis-docs/**/*.md'
];

const jsFiles = [
    // 'node_modules/bootstrap/dist/js/bootstrap.min.js',
    // 'node_modules/highlight.js/build/highlight.pack.js',
    // 'node_modules/jquery-ui/ui/widget.js',
    // 'node_modules/fontfaceonload/dist/fontfaceonload.js',
    'src/js/functions.js',
    'src/js/hash.js',
    'src/js/modal.js',
    'src/js/bookmarks.js',
    'src/js/preferences.js',
    'src/js/manager.js',
    'src/js/keyboard.js',
    'src/js/highlight.js',
    'src/js/share.js',
    // 'src/js/settings.js',
    'src/js/search.js',
    'src/js/init.js'
];

// Convert SVG
gulp.task('build:js', gulp.series( (done) => {
    gulp.src(jsFiles)
    .pipe(concat('scripts.js'))
    .pipe(gulp.dest('./assets/js/'))
    // .pipe(cache('uglify'))
    .pipe(debug({title: 'uglify:'}))
    .pipe(concat('scripts.min.js'))
    .pipe(uglify())
    // .pipe(notify("Complete: <%= file.relative %>"))
    .pipe(gulp.dest('./assets/js/'));

    done();
}));
// Convert SVG
gulp.task('build:index', gulp.series( (done) => {
    gulp.src('src/views/index.hbs')
    .pipe(tap(function(file) {
      template = handlebars.compile(file.contents.toString());
      html = template(meta);
      file.contents = new Buffer(html, "utf-8");
    }))
    .pipe(htmlmin({collapseWhitespace: minifyHtml}))
    .pipe(concat('index.html'))
    .pipe(debug({title: 'build:index'}))
    .pipe(gulp.dest('./'));

    done();
}));

gulp.task('deploy:css', gulp.series( (done) => {
    gulp.src('node_modules/nsis-bootstrap-v3/dist/css/theme.min.css')
    .pipe(gulp.dest('./assets/css'));

    done();
}));

gulp.task('deploy:svg', gulp.series( (done) => {
    gulp.src('node_modules/nsis-logo-v3/dist/Logo/outlines-light.svg')
    .pipe(concat('logo.svg'))
    .pipe(gulp.dest('./assets/img'));

    done();
}));

gulp.task('build:docs', gulp.series( (done) => {
    gulp.src('src/views/docs.hbs')
    .pipe(tap(function(file) {
        let count, html;

        let template = handlebars.compile(file.contents.toString());

        gulp.src(docMarkdown)
        .pipe(markdown())
        .pipe(tap(function(file) {

            let data = transformDocs(file.path);

            // set the contents to the contents property on data
            data.contents = file.contents.toString();
            // replace .md links
            data.contents = data.contents.replace(/\.md\"/gi, '.html"');

            if (typeof argv.theme == 'undefined') {
                data.highlightStyle = 'dark';
            } else {
                data.highlightStyle = argv.theme;
            }

            parent = path.dirname(file.path.substr(__filename.length + 1)).replace("/nsis-docs/", "");
            data.relativePath = path.join(parent, data.prettyName);
            data.version = meta.version;

            count = (data.relativePath.match(/\//g) || []).length + 1;
            data.rootFolder = "../".repeat(count);

            data.webLink = "https://nsis-dev.github.io/Documents/html/" + data.relativePath + ".html";
            data.ghLink = "https://github.com/NSIS-Dev/Documentation/edit/master/" + data.relativePath + ".md#ghLink";

            // we will pass data to the Handlebars template to create the actual HTML to use
            html = template(data);

            // replace the file contents with the new HTML created from the Handlebars template + data object that contains the HTML made from the markdown conversion
            file.contents = new Buffer(html, "utf-8");
        }))
        .pipe(htmlmin({collapseWhitespace: minifyHtml}))
        .pipe(debug({title: 'build:docs'}))
        .pipe(gulp.dest('./Documentation'));
    }));

    done()
}));

gulp.task('build:hljs', gulp.series( (done) => {
    const spawn = require('child_process').spawn;
    let opts = {
        cwd: __dirname + '/node_modules/highlight.js'
    };

    let npmInstall = spawn('npm', ['install'], opts);
    npmInstall.stdout.pipe(process.stdout);
    npmInstall.stderr.pipe(process.stderr);

    npmInstall.on('close', function (code) {
        if (0 !== code) throw new Error('npm install exited with ' + code);

        let build = spawn('node', ['tools/build.js', 'css', 'json', 'nsis', 'xml'], opts);
        build.stdout.pipe(process.stdout);
        build.stderr.pipe(process.stderr);

        build.on('close', function (code) {
          if (0 !== code) throw new Error('node tools/build.js exited with ' + code);
          done();
      });
    });
    done()
}));

// Transforms all special cases
function transformDocs(filePath) {
    let data = [];

    data.dirName = path.dirname(filePath.replace(path.join(__dirname, 'node_modules/nsis-docs'), 'html'));
    data.prettyName = path.basename(filePath, path.extname(filePath));

    data.pageTitle = [];
    data.bundle = "Nullsoft Scriptable Install System";

    if (data.dirName.endsWith('Callbacks') && data.prettyName.startsWith("on")) {
        data.name = "." + data.prettyName;
        data.type = "Function";
        data.pageTitle.push(data.bundle);
    } else if (data.dirName.endsWith('Callbacks') && data.prettyName.startsWith("un.on")) {
        data.name = data.prettyName;
        data.type = "Function";
        data.pageTitle.push(data.bundle);
    } else if (data.prettyName.startsWith("__") && data.prettyName.endsWith("__")) {
        data.name = "${" + data.prettyName + "}";
        data.type = "Constant";
        data.pageTitle.push(data.bundle);
    } else if (data.prettyName.startsWith("NSIS") && data.dirName.endsWith('Variables')) {
        data.name = "${" + data.prettyName + "}";
        data.type = "Constant";
        data.pageTitle.push(data.bundle);
    }  else if (data.dirName.endsWith('Variables')) {
        data.name = "$" + data.prettyName;
        data.type = "Variable";
        data.pageTitle.push(data.bundle);
    } else if (data.dirName.startsWith('html/Includes')) {
        data.name = "${" + data.prettyName + "}";
        data.type = "Library";
        data.bundle = path.basename(data.dirName + ".nsh");
        data.pageTitle.push(data.bundle);
    } else {
        data.name = data.prettyName;
        data.type = "Command";
        data.pageTitle.push(data.bundle);
    }

    data.pageTitle.push(data.name);
    data.pageTitle = data.pageTitle.reverse().join(" | ");

    return data;
}

gulp.task('deploy:hljs', gulp.series( (done) => {
    gulp.src('node_modules/highlight.js/build/highlight.pack.js')
    .pipe(gulp.dest('./assets/js'));

    done();
}));

// Available tasks
gulp.task('build', gulp.parallel(
    'deploy:hljs',
    'deploy:css',
    'deploy:svg',
    'build:index',
    'build:js',
    'build:docs',
    (done) => {

        done();
    }
));
