const { series, watch, src, dest } = require("gulp");
const del = require("del");
const path = require("path");
const plugins = require("gulp-load-plugins")();
const browserSync = require("browser-sync").create();
const yargs = require("yargs");
const inputIcons = "./src/icons/*.svg";

const argv = yargs
  .default("port", 1234)
  .default("production", false)
  .default("nosync", false).argv;

function clean(next) {
  del.sync(["dist"]);
  next();
}

function img() {
  return src(["./src/img/**/*.*"]).pipe(dest("./dist/img/"));
}

function assets() {
  return src(["./src/assets/**/*.*"]).pipe(dest("./dist/"));
}

function svgMin() {
  var svgs = src(inputIcons)
    .pipe(plugins.plumber())
    .pipe(
      plugins.svgmin(function (file) {
        var prefix = path.basename(file.relative, path.extname(file.relative));
        return {
          plugins: [
            {
              cleanupIDs: {
                prefix: prefix + "-",
                minify: true,
              },
            },
            {
              removeViewBox: false,
            },
            {
              removeXMLNS: true,
            },
          ],
        };
      })
    )
    .pipe(
      plugins.svgstore({
        inlineSvg: true,
      })
    )
    .pipe(
      plugins.rename(function (path) {
        path.basename = "svgsprite";
      })
    )
    .pipe(dest("./dist/img/"));

  function fileContents(filePath, file) {
    return file.contents.toString();
  }

  return src("./src/includes/svgsprite.njk")
    .pipe(plugins.inject(svgs, { transform: fileContents }))
    .pipe(dest("src/includes/"));
}

function imgOptim() {
  return src("./dist/img/**/*")
    .pipe(
      plugins.imagemin([
        plugins.imagemin.gifsicle({
          interlaced: true,
          optimizationLevel: 3,
          colors: 256,
        }),

        plugins.imagemin.mozjpeg({
          progressive: true,
          quality: 80,
        }),

        plugins.imagemin.optipng({
          optimizationLevel: 5,
          colorTypeReduction: true,
          paletteReduction: true,
          bitDepthReduction: true,
        }),

        plugins.imagemin.svgo({
          plugins: [
            { removeViewBox: true },
            { cleanupIDs: false },
            { removeComments: true },
            { removeDoctype: true },
            { cleanupAttrs: true },
            { removeTitle: true },
            { removeDesc: true },
            { minifyStyles: true },
          ],
        }),
      ])
    )
    .pipe(dest("./dist/img/"));
}

function dev(cb) {
  browserSync.init({
    port: 1234,
    server: {
      baseDir: "./dist",
    },
  });

  watch("src/scss/**/*.scss", scss);
  watch("src/js/**/*.js", js);
  watch("src/**/*.njk", njk).on("change", browserSync.reload);
  watch("src/img/**/*", img);
  watch("src/icons/**/*", svgMin);

  return cb();
}

function js() {
  return src(["./src/js/**/*.js"])
    .pipe(plugins.plumber())
    .pipe(
      plugins.babel({
        presets: ["@babel/env"],
      })
    )
    .pipe(plugins.sourcemaps.init())
    .pipe(
      plugins.if(
        argv.production,
        plugins.uglify({
          sourceMap: true,
        })
      )
    )
    .pipe(plugins.sourcemaps.write("."))
    .pipe(dest("./dist/js"))
    .pipe(
      browserSync.stream({
        match: "**/*.js",
      })
    );
}

function scss() {
  return src("src/scss/*.scss")
    .pipe(plugins.sourcemaps.init())
    .pipe(
      plugins
        .sass({
          includePaths: ["node_modules"],
          outputStyle: argv.production ? "compressed" : "expanded",
        })
        .on("error", plugins.sass.logError)
    )

    .pipe(
      plugins.autoprefixer({
        cascade: true,
      })
    )
    .pipe(plugins.sourcemaps.write("."))
    .pipe(dest("./dist/css"))
    .pipe(
      browserSync.stream({
        match: "**/*.css",
      })
    );
}

function njk(cb) {
  return src("src/*.njk")
    .pipe(plugins.nunjucks.compile())
    .pipe(
      plugins.rename((path) => {
        path.extname = ".html";
      })
    )
    .pipe(dest("./dist"));
}

function prod(cb) {
  argv.production = true;
  cb();
}

const compileAll = series(clean, njk, assets, svgMin, img, imgOptim, scss, js);

exports.scss = scss;

exports.build = series(clean, prod, compileAll);
exports.default = series(clean, compileAll, dev);
