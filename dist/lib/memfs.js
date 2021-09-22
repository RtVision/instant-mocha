"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.mRequire = exports.mfs = void 0;
const path_1 = __importDefault(require("path"));
const memfs_1 = require("memfs");
const fs_require_1 = require("fs-require");
const source_map_support_1 = __importDefault(require("source-map-support"));
exports.mfs = (0, memfs_1.createFsFromVolume)(new memfs_1.Volume());
// @ts-expect-error To support Webpack 4. No longer needed in WP5
exports.mfs.join = path_1.default.join;
source_map_support_1.default.install({
    environment: 'node',
    retrieveFile(filePath) {
        if (exports.mfs.existsSync(filePath)) {
            return exports.mfs.readFileSync(filePath).toString();
        }
    },
});
const mRequire = (modulePath) => ((0, fs_require_1.createFsRequire)(exports.mfs, {
    fs: true,
})(modulePath));
exports.mRequire = mRequire;
