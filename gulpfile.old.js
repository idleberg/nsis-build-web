'use babel';

const meta = require('./package.json');

// Dependencies
const gulp = require('gulp');
const argv = require('yargs').argv;
const cache = require('gulp-cached');
const concat = require('gulp-concat');
const cssmin   = require('gulp-cssmin');
const debug = require('gulp-debug');
const fs = require('fs');
const Handlebars = require('Handlebars');
const htmlmin = require('gulp-htmlmin');
const markdown = require('gulp-markdown');
const mkdirp = require('mkdirp');
const path = require('path');
const tap = require('gulp-tap');
const yaml = require('js-yaml');

var partialsDir = __dirname + '/src/views/partials';
var filenames = fs.readdirSync(partialsDir);

filenames.forEach(function (filename) {
  var matches = /^([^.]+).hbs$/.exec(filename);
  if (!matches) {
    return;
  }
  var name = matches[1];
  var template = fs.readFileSync(partialsDir + '/' + filename, 'utf8');
  Handlebars.registerPartial(name, template);
});


// Create target folder
// mkdirp.sync("NSIS.docset/Contents/Resources/");

// Specify included Markdown documentation
const docMarkdown = [
    '!node_modules/nsis-docs/Plugins/*.md',
    '!node_modules/nsis-docs/README.md',
    'node_modules/nsis-docs/**/*.md'
];

// Tasks
gulp.task('default', ['deploy', 'build']);
gulp.task('deploy', ['deploy:loadcss', 'deploy:hljs', 'deploy:font', 'deploy:static']);
gulp.task('build', ['build:html', 'build:index', 'build:js']);
gulp.task('build:html', ['build:doc']);

// gulp.task('test', => () {
//     let data;

//     try {
//       data = yaml.safeLoad(fs.readFileSync('./src/navbar.yml', 'utf8'));
//     } catch (e) {
//       console.log(e);
//     }
//     console.log(data);
//     console.log(tree(data));


// });

// function tree(data) {
//     let json = "<ul>";

//     for(let i = 0; i < data.length; ++i) {
//         let uri = data[i].uri !== undefined ? data[i].uri : "#";
//         json += `<li><a href="${uri}">${data[i].title}</a>`;

//         if(typeof data[i].items != 'undefined' && data[i].items.length) {
//             json += tree(data[i].items);
//         }
//         json += "</li>";
//     }
//     return json + "</ul>";
// }

// Deploy Highlight.js
gulp.task('deploy:hljs', ['build:hljs'],=> () {
    return gulp.src([
      'node_modules/highlight.js/build/highlight.pack.js'
      ])
    .pipe(cache('hljs'))
    .pipe(concat('highlight.min.js'))
    .pipe(debug({title: 'deploy:hljs'}))
    .pipe(gulp.dest('dist/assets/js/'));
});

// Deploy Highlight.js
gulp.task('deploy:loadcss', => () {
    return gulp.src([
      'node_modules/fg-loadcss/src/loadCSS.js',
      'node_modules/fg-loadcss/src/cssrelpreload.js'
      ])
    .pipe(cache('loadcss'))
    .pipe(debug({title: 'deploy:loadcss'}))
    .pipe(gulp.dest('dist/assets/js/'));
});


// Deploy Mozilla Fira
gulp.task('deploy:font', => () {
    gulp.src([
        'node_modules/mozilla-fira-pack/Fira/eot/FiraMono-Regular.eot',
        'node_modules/mozilla-fira-pack/Fira/eot/FiraSans-Light.eot',
        'node_modules/mozilla-fira-pack/Fira/eot/FiraSans-Regular.eot',

        'node_modules/mozilla-fira-pack/Fira/woff2/FiraMono-Regular.woff2',
        'node_modules/mozilla-fira-pack/Fira/woff2/FiraSans-Light.woff2',
        'node_modules/mozilla-fira-pack/Fira/woff2/FiraSans-Regular.woff2',

        'node_modules/mozilla-fira-pack/Fira/woff/FiraMono-Regular.woff',
        'node_modules/mozilla-fira-pack/Fira/woff/FiraSans-Light.woff',
        'node_modules/mozilla-fira-pack/Fira/woff/FiraSans-Regular.woff',

        'node_modules/mozilla-fira-pack/Fira/ttf/FiraMono-Regular.ttf',
        'node_modules/mozilla-fira-pack/Fira/ttf/FiraSans-Light.ttf',
        'node_modules/mozilla-fira-pack/Fira/ttf/FiraSans-Regular.ttf',

        'node_modules/font-awesome/fonts/*'
    ])
    .pipe(gulp.dest('dist/assets/fonts/'));
});


// Deploy Mozilla Fira
gulp.task('deploy:icons', => () {
    gulp.src([
        'src/img/icon.png',
        'src/img/icon@2x.png'
    ])
    .pipe(gulp.dest('dist'));
});


// Deploy Mozilla Fira
gulp.task('deploy:static', => () {
    gulp.src([
        'src/css/start.css'
    ])
    .pipe(cache('css'))
    .pipe(concat('start.min.css'))
    .pipe(debug({title: 'deploy:static'}))
    .pipe(cssmin())
    .pipe(gulp.dest('dist/assets/css/'));

    // TODO: use logo repository
    gulp.src([
        'src/img/logo.png',
        'src/img/logo.svg'
    ])
    .pipe(debug({title: 'deploy:static'}))
    .pipe(gulp.dest('dist/assets/img/'));
});



// Minify CSS
gulp.task('build:css', => () {
    gulp.src([
        'src/css/fonts.css',
        'node_modules/font-awesome/css/font-awesome.css',
        'src/css/highlighter.css',
        'src/css/theme.css'
    ])
    .pipe(cache('css'))
    .pipe(concat('docset.min.css'))
    .pipe(debug({title: 'build:css'}))
    .pipe(cssmin())
    .pipe(gulp.dest('dist/assets/css/'));
});


// Create index page
gulp.task('build:index', => () {
    return gulp.src('src/views/index.hbs')
    .pipe(tap(function(file) {
        template = Handlebars.compile(file.contents.toString());
        html = template(meta);
        file.contents = new Buffer(html, "utf-8");
    }))
    .pipe(htmlmin({collapseWhitespace: true}))
    .pipe(concat('index.html'))
    .pipe(debug({title: 'build:index'}))
    .pipe(gulp.dest('dist/'));
    // }));
});


// Convert Markdown to HTML & compile Handlebars
// via http://learningwithjb.com/posts/markdown-and-handlebars-to-make-pages
gulp.task('build:doc', => () {
    return gulp.src('src/views/docs.hbs')
    .pipe(tap(function(file) {
        let count, html, template;

        


        
        template = Handlebars.compile(file.contents.toString());

        return gulp.src(docMarkdown)
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
        data.assetDepth = "../".repeat(count);

        data.webLink = "https://NSIS-Dev.github.io/Documents/html/" + data.relativePath + ".html";
        data.ghLink = "https://github.com/NSIS-Dev/Documentation/edit/master/" + data.relativePath + ".md";

        // we will pass data to the Handlebars template to create the actual HTML to use
        html = template(data);

        // replace the file contents with the new HTML created from the Handlebars template + data object that contains the HTML made from the markdown conversion
        file.contents = new Buffer(html, "utf-8");
    }))
    .pipe(htmlmin({collapseWhitespace: true}))
    .pipe(debug({title: 'build:doc'}))
    .pipe(gulp.dest('dist/Documentation'));
    }));
});


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

// Minify JS
gulp.task('build:js', => () {
  return gulp.src([
      // 'node_modules/bootstrap/dist/js/bootstrap.min.js',
      // 'node_modules/highlight.js/build/highlight.pack.js',
      'node_modules/jquery-ui/dist/jquery-ui.pack.js',
      // 'node_modules/fontfaceonload/dist/fontfaceonload.js',
      'src/js/functions.js',
      'src/js/hash.js',
      'src/js/bookmarks.js',
      'src/js/modal.js',
      'src/js/preferences.js',
      'src/js/manager.js',
      'src/js/keyboard.js',
      'src/js/highlight.js',
      'src/js/share.js',
      'src/js/settings.js',
      'src/js/search.js'
    ])
    .pipe(concat('scripts.js'))
    .pipe(gulp.dest('assets/js/'))
    .pipe(cache('uglify'))
    .pipe(debug({title: 'uglify:'}))
    .pipe(concat('scripts.min.js'))
    .pipe(uglify())
    .pipe(notify("Complete: <%= file.relative %>"))
    .pipe(gulp.dest('assets/js/'));
});


// Build Highlight.js
// via https://github.com/kilianc/rtail/blob/develop/gulpfile.js#L69
gulp.task('build:hljs', function (done) {
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
});
