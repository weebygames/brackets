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

    var fs = new WebDAV.Fs('http://webdav-' + window.location.host);
    WebDAV.useCredentials = true;

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

    function _makeStat(webdavFile) {
        return {
            isFile: webdavFile.type === 'file',
            mtime: webdavFile.mtime,
            hash: webdavFile.size * webdavFile.size * webdavFile.mtime.getTime(),
            size: webdavFile.size
        };
    }

    function _getFile(path, callback) {
        var f = fs.file(path);

        f.propfind(function(props) {
            if (!f.exists) {
                callback(FileSystemError.NOT_FOUND);
            } else {
                callback(f);
            }
        });
    }

    function stat(path, callback) {
        if (_startsWith(path, CORE_EXTENSIONS_PREFIX)) {
            AjaxFileSystem.stat(path, callback);
            return;
        }

        _getFile(path, function(f) {
            if (typeof f === 'string') {
                callback(f);
            } else {
                var stat = _makeStat(f);
                callback(null, stat);
            }
        });
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

        _getFile(path, function(f) {
            if (typeof f === 'string') {
                callback(f);
            } else {
                f.children(function(children) {
                    var names = [];
                    var stats = [];
                    children.forEach(function (child) {
                        names.push(child.name);
                        stats.push(_makeStat(child));
                    });
                    callback(null, names, stats);
                });
            }
        });
    }

    function mkdir(path, mode, callback) {
        console.log("Make directory: " + path + " [mode " + mode + "]");

        if (typeof mode === "function") {
            callback = mode;
            mode = parseInt("0755", 8);
        }

        // TODO: add support for setting the mode
        var f = fs.dir(path);
        f.mkdir(function(data, status) {
            if (status >= 300) {
                // TODO: better error handling
                callback(FileSystemError.UNKNOWN);
            } else {
                stat(path, function (err, stat) {
                    callback(err, stat);
                });
            }
        });
    }

    function rename(oldPath, newPath, callback) {
        console.log("Rename file: " + oldPath + " -> " + newPath);

        _getFile(oldPath, function(f) {
            if (typeof f === 'string') {
                callback(f);
            } else {
                f.mv(newPath, function(data, status) {
                    if (status >= 300) {
                        // TODO: better error handling
                        callback(FileSystemError.UNKNOWN);
                    } else {
                        callback(null, null);
                    }
                });
            }
        });
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

        _getFile(path, function(f) {
            if (typeof f === 'string') {
                callback(f);
            } else {
                f.read(function(data, status) {
                    var stat = _makeStat(f);
                    callback(null, data || '', stat);
                });
            }
        });
    }


    function writeFile(path, data, options, callback) {
        console.log("Write file: " + path + " [length " + data.length + "]");

        // TODO: Make use of the options for verifying writes
        _getFile(path, function(f) {
            var created = false;
            if (f === 'NotFound') {
                created = true;
                f = fs.file(path);
            } else if (typeof f === 'string') {
                callback(f);
                return
            }

            f.write(data, function(data, status) {
                if (status >= 300) {
                    // TODO: better error handling
                    callback(FileSystemError.UNKNOWN);
                } else {
                    stat(path, function (err, stat) {
                        callback(err, stat, created);
                    });
                }
            });
        });
    }

    function unlink(path, callback) {
        console.log("Unlink: " + path);

        // FIXME
        throw new Error();
    }

    function moveToTrash(path, callback) {
        console.log("Trash file: " + path);

        _getFile(path, function(f) {
            if (typeof f === 'string') {
                callback(f);
            } else {
                f.rm(function(data, status) {
                    if (status >= 300) {
                        // TODO: better error handling
                        callback(FileSystemError.UNKNOWN);
                    } else {
                        callback();
                    }
                });
            }
        });
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