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
        AjaxFileSystem  = require("filesystem/impls/demo/AjaxFileSystem"),
        AppInit         = require("utils/AppInit"),
        NodeConnection  = require("utils/NodeConnection"),
        FileUtils       = require("file/FileUtils"),
        FileSystem      = require("filesystem/FileSystem"),
        global          = require("utils/Global").global;


    // Brackets uses FileSystem to read from various internal paths that are not in the user's project storage. We
    // redirect core-extension access to a simple $.ajax() to read from the source code location we're running from,
    // and for now we ignore we possibility of user-installable extensions or persistent user preferences.
    var CORE_EXTENSIONS_PREFIX = PathUtils.directory(window.location.href) + "extensions/default/";
//    var USER_EXTENSIONS_PREFIX = "/.brackets.user.extensions$/";
//    var CONFIG_PREFIX = "/.$brackets.config$/";

    /**
     * @private
     * @type {NodeConnection}
     * Connects to ExtensionManagerDomain
     */
    var _nodeConnection;

    /**
     * @private
     * @type {jQuery.Deferred.<NodeConnection>}
     * A deferred which is resolved with a NodeConnection or rejected if
     * we are unable to connect to Node.
     */
    var _nodeConnectionDeferred = $.Deferred();

    function _filesystemDomainCall(callback) {
        if (!_nodeConnection) {
            _nodeConnection = new NodeConnection();
            _nodeConnection.connect(true).then(function () {
                var domainPath = FileUtils.getBracketsHome() + "/" + FileUtils.getNativeModuleDirectoryPath(module) + "/node/RemoteFilesystemDomain";

                _nodeConnection.loadDomains(domainPath, true)
                    .then(
                        function () {
                            console.log("[FileSystem] Connection established!");
                            _nodeConnectionDeferred.resolve();
                        },
                        function () { // Failed to connect
                            console.error("[Filesystem] Failed to connect to node", arguments);
                            _nodeConnectionDeferred.reject();
                        }
                    );
            });
        }

        if (_nodeConnection.domains.filesystem) {
            // The filesystem is ready for use, immediately call back
            return callback(_nodeConnection.domains.filesystem);
        } else if(_nodeConnection) {
            // There is a connection, waiting to connect
            return _nodeConnectionDeferred.done(function() {
                callback(_nodeConnection.domains.filesystem);
            });
        } else {
            console.error('FilesystemDomain is not ready');
            return new $.Deferred().reject("filesystem domain is undefined").promise();
        }
    }

    // var fs = new WebDAV.Fs('http://webdav-' + window.location.host);
    // WebDAV.useCredentials = true;

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

    function _parseStat(stat) {
        stat.mtime && (stat.mtime = new Date(stat.mtime));
        return stat;
    };

    function stat(path, callback) {
        if (_startsWith(path, CORE_EXTENSIONS_PREFIX)) {
            AjaxFileSystem.stat(path, callback);
            return;
        }

        _filesystemDomainCall(function (filesystemDomain) {
            filesystemDomain.stat(path)
                .done(function (stat) {
                    if (stat.err) {
                        callback(stat.err);
                    } else {
                        _parseStat(stat);
                        callback(null, stat);
                    }
                });
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

        _filesystemDomainCall(function (filesystemDomain) {
            filesystemDomain.readDir(path)
                .done(function (results) {
                    if (results.err) {
                        callback(results.err);
                    } else {
                        results.stats.forEach(_parseStat);
                        callback(null, results.names, results.stats);
                    }
                });
        });
    }

    function mkdir(path, mode, callback) {
        console.log("Make directory: " + path + " [mode " + mode + "]");

        if (typeof mode === "function") {
            callback = mode;
            mode = parseInt("0755", 8);
        }

        _filesystemDomainCall(function (filesystemDomain) {
            filesystemDomain.makeDir(path, mode)
                .done(function (stat) {
                    if (stat.err) {
                        callback(stat.err);
                    } else {
                        _parseStat(stat);
                        callback(null, stat);
                    }
                });
        });
    }

    function rename(oldPath, newPath, callback) {
        console.log("Rename file: " + oldPath + " -> " + newPath);

        _filesystemDomainCall(function (filesystemDomain) {
            filesystemDomain.move(oldPath, newPath)
                .done(function (response) {
                    if (response.err) {
                        callback(response.err);
                    } else {
                        callback(null, null);
                    }
                });
        });
    }

    function readFile(path, options, callback) {
        if (typeof options === "function") {
            callback = options;
        }

        if (_startsWith(path, CORE_EXTENSIONS_PREFIX)) {
            console.log("Ajax load: " + path);
            AjaxFileSystem.readFile(path, callback);
            return;
        }

        console.log("Reading 'file': " + path);
        _filesystemDomainCall(function (filesystemDomain) {
            filesystemDomain.readFile(path)
                .done(function (response) {
                    if (response.err) {
                        callback(response.err);
                    } else {
                        _parseStat(response.stat);
                        callback(null, response.contents, response.stat);
                    }
                });
        });
    }


    function writeFile(path, data, options, callback) {
        console.log("Write file: " + path + " [length " + data.length + "]");

        _filesystemDomainCall(function (filesystemDomain) {
            filesystemDomain.writeFile(path, data, options)
                .done(function (response) {
                    if (response.err) {
                        callback(response.err);
                    } else {
                        _parseStat(response.stat);
                        callback(null, response.stat, response.created);
                    }
                });
        });
    }

    function unlink(path, callback) {
        console.log("Unlink: " + path);

        _filesystemDomainCall(function (filesystemDomain) {
            filesystemDomain.unlink(path)
                .done(function (response) {
                    if (response && response.err) {
                        callback(response.err);
                    } else {
                        callback(null);
                    }
                });
        });
    }

    function visit(path, callback) {
        console.log("Visit: " + path);

        _filesystemDomainCall(function (filesystemDomain) {
            filesystemDomain.visit(path)
                .done(function (results) {
                    if (results.err) {
                        callback(results.err);
                    } else {
                        callback(null, results);
                    }
                });
        });
    };

    function moveToTrash(path, callback) {
        console.log("Trash file: " + path);

        // TODO: Fix this
        console.warn('TODO: Currently an alias for unlink');

        unlink(path, callback);
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
    exports.visit           = visit;

    exports.recursiveWatch    = true;
    exports.normalizeUNCPaths = false;
});