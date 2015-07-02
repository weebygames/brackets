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


/*jslint vars: true, plusplus: true, devel: true, node: true, nomen: true,
indent: 4, maxerr: 50 */

"use strict";

var fs = require('fs');
var _path = require('path');
var crypto = require('crypto');

var walkdir = require('walkdir');

function _createHash(data) {
    var hash = crypto.createHash('sha1');
    hash.setEncoding('hex');
    hash.write(data);
    hash.end();
    return hash.read();
}

function _makeBracketsStat(stats) {
    return {
        isFile: stats.isFile(),
        mtime: stats.mtime,
        hash: _createHash('' + stats.mtime + stats.ctime + stats.birthtime + stats.size),
        size: stats.size,
    };
}

function _cmdStat(path, callback) {
    fs.stat(path, function(err, stat) {
        if (err) {
            callback(null, {err: err.code});
            return;
        }

        callback(null, _makeBracketsStat(stat));
    });
}

function _cmdReadFile(path, callback) {
    _cmdStat(path, function(err, stat) {
        if (stat.err) {
            callback(null, stat);
            return;
        }

        fs.readFile(path, 'utf8', function(err, data) {
            if (err) {
                callback(null, {err: err.code});
                return;
            }

            callback(null, {
                contents: data,
                stat: stat
            });
        });
    });
}

function _cmdWriteFile(path, data, options, callback) {
    var created = !fs.existsSync(path);

    fs.writeFile(path, data, options, function(err) {
        if (err) {
            callback(null, {err: err.code});
        }

        // Get the stat
        _cmdStat(path, function(err, stat) {
            if (stat.err) {
                callback(null, stat);
                return;
            }

            callback(null, {
                stat: stat,
                created: created
            });
        });
    });
}

function _cmdReadDir(path, callback) {
    _cmdStat(path, function(err, stat) {
        if (stat.err) {
            callback(null, stat);
            return;
        }

        var results = {
            names: [],
            stats: []
        };

        var opts = {
            follow_symlinks: true, // default is off
            no_recurse: false,      // only recurse one level deep
            max_depth: 1
        };

        var ignorePattern = /\/\..*/;

        walkdir.sync(path, opts, function(path, stat) {
            if (path.match(ignorePattern)) {
                return;
            }

            results.names.push(_path.basename(path));
            results.stats.push(_makeBracketsStat(stat));
        });

        callback(null, results);
    });
}

function _cmdMakeDir(path, mode, callback) {
    fs.mkdir(path, mode, function(err) {
        if (err) {
            callback(null, {err: err.code});
        }

        _cmdStat(path, callback);
    });
}

function _cmdMove(oldPath, newPath, callback) {
    fs.rename(oldPath, newPath, function(err) {
        if (err) {
            callback(null, {err: err.code});
        }
        callback(null);
    });
}

function _cmdUnlink(path, callback) {
    fs.unlink(path, function(err) {
        if (err) {
            callback(null, {err: err.code});
        }
        callback(null);
    });
}

function _cmdVisit(path, options, callback) {
    // The problem with this function is that many of the visitor functions assume the visit will happen breadth first.
    // In some cases the user may want to specify depth, but for now it is just defaulted to 1

    // Reconstruct any of the regexp
    if (options.all) {
        if (options.all.path) options.all.path = new RegExp(options.all.path);
        if (options.all.name) options.all.name = new RegExp(options.all.name);
    }
    if (options.file) {
        if (options.file.name) options.file.name = new RegExp(options.file.name);
    }
    if (options.dir) {
        if (options.dir.path) options.dir.path = new RegExp(options.dir.path);
        // No trailing slash
        if (options.dir.relative && options.dir.relative.lastIndexOf('/') === options.dir.relative.length - 1) {
            options.dir.relative = options.dir.relative.substring(0, options.dir.relative.length - 1);
        }
    }

    var walkOpts = {
        follow_symlinks: true, // default is off
        no_recurse: false,      // only recurse one level deep
        max_depth: 1
    };
    var maxFileCount = options.all.maxFileCount || 500;
    var results = [];

    var visitCount = 0;
    var visitsComplete = 0;

    // Filter out files or folders
    var ignorePattern = /\/\..*/;
    var visit = function(path, isDir) {
        var name = _path.basename(path);

        if (isDir && results.length >= maxFileCount) { return false; }

        // All
        if (options.all) {
            if (options.all.path && path.match(options.all.path)) { return false; }
            if (options.all.name && name.match(options.all.name)) { return false; }
            if (options.all.dotFiles && name.indexOf('.') === 0) { return false; }
        }
        // File
        if (options.file && !isDir) {
            if (options.file.name && name.match(options.file.name)) { return false; }
            if (options.file.exactPath && options.file.exactPath.indexOf(path) >= 0) { return false; }
            if (options.file.ext && _path.extname(name) !== options.file.ext) { return false; }
        }
        // Folder
        if (options.dir && isDir) {
            var relativePath = path;
            if (options.dir.relative && relativePath.indexOf(options.dir.relative) === 0) {
                relativePath = relativePath.substring(options.dir.relative.length + 1, relativePath.length);
            }
            // no trailing slash
            if (relativePath.lastIndexOf('/') === relativePath.length - 1) {
                relativePath = relativePath.substring(0, relativePath.length - 1);
            }
            if (options.dir.path && relativePath.match(options.dir.path)) { return false; }
        }

        if (path.match(ignorePattern)) {
            return false;
        }

        return true;
    };


    var visitHelper = function(path) {
        visitCount++;
        // console.log('visit ct', visitCount, path);

        var emitter = walkdir(path, walkOpts);

        emitter.on('file', function(path, stat) {
            if (!visit(path, false)) {
                return;
            }

            results.push({ path: path, type: 'file' });
        });

        emitter.on('directory', function(path, stat) {
            if (!visit(path, true)) {
                return;
            }

            results.push({ path: path, type: 'dir' });
            visitHelper(path);
        });

        emitter.on('error', function(path, err) {
            callback(null, {err: err.code});
        });

        emitter.on('end', function() {
            visitsComplete++;
            // console.log('visits complete', visitsComplete, '/', visitCount);
            if (visitsComplete == visitCount) {
                callback(null, results);
            }
        });
    };

    visitHelper(path);
}

/**
 * Initialize the "projects" domain.
 * The extensions domain handles downloading, unpacking/verifying, and installing extensions.
 */
function init(domainManager) {
    var domainName = "filesystem";
    if (!domainManager.hasDomain(domainName)) {
        domainManager.registerDomain(domainName, {major: 0, minor: 1});
    }

    domainManager.registerCommand(
        domainName,
        "stat",
        _cmdStat,
        true,
        "Returns a minimal stat object",
        [{
            name: "path",
            type: "string",
            description: "absolute filesystem path"
        }],
        {
            name: "stat",
            type: "object",
            description: "minimal stat object"
        }
    );

    domainManager.registerCommand(
        domainName,
        "readFile",
        _cmdReadFile,
        true,
        "Returns the contents of a file",
        [{
            name: "path",
            type: "string",
            description: "absolute filesystem path"
        }],
        {
            name: "contents",
            type: "object",
            description: "contents of file at path"
        }
    );

    domainManager.registerCommand(
        domainName,
        "writeFile",
        _cmdWriteFile,
        true,
        "Writes the contents of a file",
        [{
            name: "path",
            type: "string",
            description: "absolute filesystem path"
        },{
            name: "data",
            type: "string",
            description: "file contents"
        },{
            name: "options",
            type: "object",
            description: "options to apply to the file"
        }],
        {
            name: "response",
            type: "object",
            description: "stat, created"
        }
    );

    domainManager.registerCommand(
        domainName,
        "readDir",
        _cmdReadDir,
        true,
        "Returns the contents of a file",
        [{
            name: "path",
            type: "string",
            description: "absolute filesystem path"
        }],
        {
            name: "contents",
            type: "object",
            description: "contents of file at path"
        }
    );

    domainManager.registerCommand(
        domainName,
        "makeDir",
        _cmdMakeDir,
        true,
        "Make a new directory",
        [{
            name: "path",
            type: "string",
            description: "absolute filesystem path"
        },{
            name: "mode",
            type: "int",
            description: "mode to apply to new dir"
        }],
        {
            name: "stat",
            type: "object",
            description: "stat"
        }
    );

    domainManager.registerCommand(
        domainName,
        "move",
        _cmdMove,
        true,
        "Move a file from one path to another",
        [{
            name: "oldPath",
            type: "string",
            description: "absolute filesystem path"
        },{
            name: "newPath",
            type: "string",
            description: "absolute filesystem path"
        }],
        {
            name: "response",
            type: "object",
            description: "null if all went well"
        }
    );

    domainManager.registerCommand(
        domainName,
        "unlink",
        _cmdUnlink,
        true,
        "Unlink a file",
        [{
            name: "path",
            type: "string",
            description: "absolute filesystem path"
        }],
        {
            name: "response",
            type: "object",
            description: "null if all went well"
        }
    );

    domainManager.registerCommand(
        domainName,
        "visit",
        _cmdVisit,
        true,
        "Visits file and all children",
        [{
            name: "path",
            type: "string",
            description: "absolute filesystem path"
        },{
            name: "options",
            type: "object",
            description: "options for filtering"
        }],
        {
            name: "results",
            type: "array",
            description: "List of all the children"
        }
    );
}

// used in unit tests
exports._cmdVisit = _cmdVisit;

// used to load the domain
exports.init = init;
