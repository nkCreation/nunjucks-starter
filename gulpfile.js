const { series, watch, src, dest } = require("gulp");
const del = require("del");
const path = require("path");
const plugins = require("gulp-load-plugins")();
const browserSync = require("browser-sync").create();
const inputIcons = "./src/icons/*.svg";
const datas = require("./utils/assemble-data.js");
const sass = require("gulp-sass")(require("sass"));
const yargs = require("yargs/yargs");
const { hideBin } = require("yargs/helpers");
const argv = yargs(hideBin(process.argv)).argv;

const PORT = argv.port || 1234;
let isProduction = argv.production || false;

function clean(next) {
  del.sync(["dist"]);
  next();
}

function img() {
  return src(["./src/img/**/*.*"]).pipe(dest("./dist/img/"));
}

function statics() {
  return src(["./src/statics/**/*.*"]).pipe(dest("./dist/"));
}

function svgMin() {
  var svgs = src(inputIcons)
    .pipe(plugins.plumber())
    .pipe(
      plugins.svgmin(function (file) {
        const prefix = path.basename(
          file.relative,
          path.extname(file.relative)
        );

        return {
          plugins: [
            {
              name: "preset-default",
              params: {
                overrides: {
                  cleanupIDs: {
                    prefix: prefix + "-",
                    minify: true,
                  },
                  removeViewBox: false,
                  removeXMLNS: true,
                },
              },
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
    port: PORT,
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
    .pipe(plugins.if(!isProduction, plugins.sourcemaps.init()))
    .pipe(
      plugins.if(
        isProduction,
        plugins.uglify({
          sourceMap: false,
        })
      )
    )
    .pipe(plugins.if(!isProduction, plugins.sourcemaps.write(".")))
    .pipe(dest("./dist/js"))
    .pipe(
      browserSync.stream({
        match: "**/*.js",
      })
    );
}

function scss() {
  return src("src/scss/*.scss")
    .pipe(plugins.if(!isProduction, plugins.sourcemaps.init()))
    .pipe(
      sass({
        includePaths: ["node_modules"],
        outputStyle: isProduction ? "compressed" : "expanded",
      }).on("error", sass.logError)
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

async function njk(cb) {
  const data = await datas.read();
  const result = src("src/*.njk")
    .pipe(plugins.nunjucks.compile(data))
    .pipe(
      plugins.rename((path) => {
        path.extname = ".html";
      })
    )
    .pipe(dest("./dist"));

  await Promise.resolve(result);
}

function prod(cb) {
  isProduction = true;
  cb();
}

function css() {
  return src("dist/css/**/*.css")
    .pipe(
      plugins.purgecss({
        content: ["dist/**/*.html"],
      })
    )
    .pipe(dest("dist/css"));
}

const compileAll = series(clean, njk, statics, svgMin, img, imgOptim, scss, js);

exports.scss = scss;

exports.build = series(clean, prod, compileAll, css);
exports.default = series(clean, compileAll, dev);
