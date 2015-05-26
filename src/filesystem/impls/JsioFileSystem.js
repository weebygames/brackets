/*
 * Copyright (c) 2013 Adobe Systems Incorporated. All rights reserved.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 *
 */


/*jslint vars: true, plusplus: true, devel: true, nomen: true, regexp: true, indent: 4, maxerr: 50 */
/*global define, window, PathUtils */

define(function (require, exports, module) {
    "use strict";

    var FileSystemError = require("filesystem/FileSystemError"),
        FileSystemStats = require("filesystem/FileSystemStats"),
        AjaxFileSystem  = require("filesystem/impls/demo/AjaxFileSystem");


    // Brackets uses FileSystem to read from various internal paths that are not in the user's project storage. We
    // redirect core-extension access to a simple $.ajax() to read from the source code location we're running from,
    // and for now we ignore we possibility of user-installable extensions or persistent user preferences.
    var CORE_EXTENSIONS_PREFIX = PathUtils.directory(window.location.href) + "extensions/default/";
//    var USER_EXTENSIONS_PREFIX = "/.brackets.user.extensions$/";
//    var CONFIG_PREFIX = "/.$brackets.config$/";


    // Static, hardcoded file tree structure to serve up. Key is entry name, and value is either:
    //  - string = file
    //  - object = nested folder containing more entries
    var demoContent = {
        "index.html": "<html>\n<head>\n    <title>Hello, world!</title>\n</head>\n<body>\n    Welcome to Brackets!\n</body>\n</html>",
        "main.css": ".hello {\n    content: 'world!';\n}",
        "main.js": "function sayHello() {\n    console.log('Hello, world!');\n}"
    };


    function _startsWith(path, prefix) {
        return (path.substr(0, prefix.length) === prefix);
    }

    function _stripTrailingSlash(path) {
        return path[path.length - 1] === "/" ? path.substr(0, path.length - 1) : path;
    }

    function _nameFromPath(path) {
        var segments = _stripTrailingSlash(path).split("/");
        return segments[segments.length - 1];
    }


    function stat(path, callback) {
        if (_startsWith(path, CORE_EXTENSIONS_PREFIX)) {
            AjaxFileSystem.stat(path, callback);
            return;
        }

        throw new Error('implement stat /stat');
        // var result = _getDemoData(path);
        // if (result || result === "") {
            // callback(null, _makeStat(result));
        // } else {
        //     callback(FileSystemError.NOT_FOUND);
        // }
    }

    function exists(path, callback) {
        stat(path, function (err) {
            if (err) {
                callback(null, false);
            } else {
                callback(null, true);
            }
        });
    }

    function readdir(path, callback) {
        if (_startsWith(path, CORE_EXTENSIONS_PREFIX)) {
            callback("Directory listing unavailable: " + path);
            return;
        }

        throw new Error("implement readdir /getDir");
        // var storeData = _getDemoData(path);
        // if (!storeData) {
        //     callback(FileSystemError.NOT_FOUND);
        // } else if (typeof storeData === "string") {
        //     callback(FileSystemError.INVALID_PARAMS);
        // } else {
            // var names = Object.keys(storeData);
            // var stats = [];
            // names.forEach(function (name) {
            //     stats.push(_makeStat(storeData[name]));
            // });
            // callback(null, names, stats);
        // }
    }

    function mkdir(path, mode, callback) {
        console.log("Make directory: " + path + " [mode " + mode + "]");

        // FIXME
        throw new Error();
    }

    function rename(oldPath, newPath, callback) {
        console.log("Rename file: " + oldPath + " -> " + newPath);

        // FIXME
        throw new Error();
    }

    function readFile(path, options, callback) {
        console.log("Reading 'file': " + path);

        if (typeof options === "function") {
            callback = options;
        }

        if (_startsWith(path, CORE_EXTENSIONS_PREFIX)) {
            AjaxFileSystem.readFile(path, callback);
            return;
        }

        // var storeData = _getDemoData(path);
        // if (!storeData && storeData !== "") {
        //     callback(FileSystemError.NOT_FOUND);
        // } else if (typeof storeData !== "string") {
        //     callback(FileSystemError.INVALID_PARAMS);
        // } else {
        //     var name = _nameFromPath(path);
        //     callback(null, storeData, _makeStat(storeData[name]));
        // }
        throw new Error('implement readFile /getFile');
    }


    function writeFile(path, data, options, callback) {
        console.log("Write file: " + path + " [length " + data.length + "]");

        // FIXME
        throw new Error();
    }

    function unlink(path, callback) {
        console.log("Unlink: " + path);

        // FIXME
        throw new Error();
    }

    function moveToTrash(path, callback) {
        console.log("Trash file: " + path);

        // FIXME
        throw new Error();
    }

    function initWatchers(changeCallback, offlineCallback) {
        // Ignore - since this FS is immutable, we're never going to call these
    }

    function watchPath(path, callback) {
        console.warn("File watching (watchPath) is not supported");
        callback();
    }

    function unwatchPath(path, callback) {
        console.warn("File watching (unwatchPath) is not supported");
        callback();
    }

    function unwatchAll(callback) {
        console.warn("File watching (unwatchAll) is not supported");
        callback();
    }

    function showOpenDialog(allowMultipleSelection, chooseDirectories, title, initialPath, fileTypes, callback) {
        // FIXME
        throw new Error();
    }

    function showSaveDialog(title, initialPath, proposedNewFilename, callback) {
        // FIXME
        throw new Error();
    }


    // Export public API
    exports.showOpenDialog  = showOpenDialog;
    exports.showSaveDialog  = showSaveDialog;
    exports.exists          = exists;
    exports.readdir         = readdir;
    exports.mkdir           = mkdir;
    exports.rename          = rename;
    exports.stat            = stat;
    exports.readFile        = readFile;
    exports.writeFile       = writeFile;
    exports.unlink          = unlink;
    exports.moveToTrash     = moveToTrash;
    exports.initWatchers    = initWatchers;
    exports.watchPath       = watchPath;
    exports.unwatchPath     = unwatchPath;
    exports.unwatchAll      = unwatchAll;

    exports.recursiveWatch    = true;
    exports.normalizeUNCPaths = false;
});