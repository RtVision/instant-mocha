"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const assert_1 = __importDefault(require("assert"));
const collect_files_js_1 = __importDefault(require("mocha/lib/cli/collect-files.js"));
const aggregate_error_1 = __importDefault(require("aggregate-error"));
const ansi_escapes_1 = __importDefault(require("ansi-escapes"));
const mocha_1 = require("./lib/mocha");
const webpack_1 = require("./lib/webpack");
async function getWebpackConfig(webpackConfigPath, options) {
    (0, assert_1.default)(fs_1.default.existsSync(webpackConfigPath), `Invalid Webpack configuration path: ${webpackConfigPath}`);
    let config;
    try {
        // eslint-disable-next-line node/global-require
        config = require(webpackConfigPath);
    }
    catch (error) {
        if (error.code === 'ERR_REQUIRE_ESM') {
            // Using webpacks new function approach to avoid typescript
            // from transpiling dynamic import to require which breaks
            // the purpose of this since require can only load cjs files
            // and not esm modules
            // See issue https://github.com/microsoft/TypeScript/issues/43329
            // eslint-disable-next-line no-new-func
            const dynamicImport = new Function('id', 'return import(id);');
            config = (await dynamicImport(webpackConfigPath)).default;
        }
        else {
            throw new Error(`Faild to load Webpack configuration: ${webpackConfigPath}`);
        }
    }
    if (typeof config === 'function') {
        const environment = {};
        if (options.watch) {
            environment.WEBPACK_WATCH = true;
        }
        else {
            environment.WEBPACK_BUILD = true;
        }
        const argv = {
            env: environment,
        };
        if (options.mode) {
            argv.mode = options.mode;
        }
        if (options.watch) {
            argv.watch = options.watch;
        }
        return config(environment, argv);
    }
    if (options.mode) {
        config.mode = options.mode;
    }
    return config;
}
async function instantMocha(options) {
    (0, assert_1.default)(options.webpackConfig, 'Webpack configuration path must be passed in');
    const webpackConfigPath = path_1.default.resolve(options.webpackConfig);
    const webpackConfig = await getWebpackConfig(webpackConfigPath, options);
    const testFiles = (0, collect_files_js_1.default)({
        ignore: [],
        file: [],
        ...options,
    });
    if (options.watch) {
        if (!webpackConfig.plugins) {
            webpackConfig.plugins = [];
        }
        webpackConfig.plugins.unshift({
            apply(compiler) {
                compiler.hooks.watchRun.tap('InstantMocha', () => {
                    process.stdout.write(ansi_escapes_1.default.clearTerminal);
                });
            },
        });
    }
    const webpackCompiler = (0, webpack_1.createWebpackCompiler)(webpackConfig, testFiles);
    if (options.watch) {
        webpackCompiler.watch({}, (error, stats) => {
            if (error) {
                console.log(error);
                return;
            }
            if (stats.hasErrors()) {
                console.log(new aggregate_error_1.default(stats.compilation.errors));
                return;
            }
            if (stats.hasWarnings()) {
                for (const warning of stats.compilation.warnings) {
                    console.log(warning);
                }
            }
            /**
             * Had issues with Webpackbar and a multi-page test report.
             * It wasn't possible to clear the previous report output
             * because it seemed like Webpackbar was storing it and
             * re-printing.
             *
             * Running mocha detached from this stack seems to escape
             * the stdout caching.
             */
            setImmediate(() => {
                (0, mocha_1.runMocha)(options);
            });
        });
    }
    else {
        await webpackCompiler.$run();
        return await (0, mocha_1.runMocha)(options);
    }
}
exports.default = instantMocha;
