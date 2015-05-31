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

var walkdir = require('walkdir');

var Errors = {
    CANCELED: "CANCELED"
};

var Statuses = {
    FAILED: "FAILED"
};

function _cmdVisit(path, callback) {
    var results = [];

    var opts = {
        follow_symlinks: true, // default is off
        no_recurse: false,      // only recurse one level deep
        max_depth: 10
    };

    var ignorePattern = /\/\..*/;

    walkdir.sync(path, opts, function(path, stat) {
        // var filePath = path.join(dirPath, fileName);

        if (path.match(ignorePattern)) {
            return;
        }

        var type = '';
        if (stat.isDirectory()) {
            type = 'dir';
        } else if (stat.isFile()) {
            type = 'file';
        } else {
            return;
        }

        results.push({ path: path, type: type });
    });

    callback(null, results);
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
        "visit",
        _cmdVisit,
        true,
        "Visits file and all children",
        [{
            name: "path",
            type: "string",
            description: "absolute filesystem path"
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
