/*jslint regexp:true*/
/*global module, require*/

module.exports = function (grunt) {
    "use strict";

    var fs = require('fs');

    var renderTemplate = function(src, dest, data, cb) {
        var template = require('swig');
        var tmpl = template.compileFile(src);
        var outputContents = tmpl(data);

        fs.writeFile(dest, outputContents, 'utf-8', cb);
    };

    grunt.registerTask('generate-appcache', 'Scan src directory and generate the brackets.appcache file', function () {
        var done = this.async();

        var appcacheGenOptions = {
            options: {
                cwd: 'src',
                ignore: ['**/test/**', '**/tests/**', '**/unittest*/**', '**/examples/**', '**/node_modules/**']
            },
            includes: [
                { name: 'js', patternParts: ['**/*.js'] },
                { name: 'html', patternParts: ['htmlContent/**/*.html'] },
                { name: 'less', patternParts: ['styles/**/*.less'] },
                { name: 'ttf', patternParts: ['styles/**/*.ttf'] },
                { name: 'img', patternParts: ['styles/images/**/*.*'] },
                { name: 'img', patternParts: ['styles/images/**/*.*'] },
            ]
        };

        // TODO: less, LiveDevelopment, json

        var Promise = require('bluebird');
        var glob = Promise.promisify(require('glob'));

        Promise.reduce(appcacheGenOptions.includes, function(results, include) {
            var pattern = include.patternParts.length > 1 ?
                '{' + include.patternParts.join(',') + '}' :
                include.patternParts[0];
            console.log('Glob:  ' + pattern);
            return glob(pattern, appcacheGenOptions.options)
                .then(function(files) {
                    console.log('> ' + include.name + ' files: ' + files.length);
                    results.push({
                        name: include.name,
                        files: files
                    });
                    return results;
                });
        }, [])
        .then(function (results) {
            // gen and write the template
            renderTemplate(
                'src/brackets.appcache.template',
                'src/brackets.appcache',
                {
                    buildTime: Date.now(),
                    gitHash: 'TODO',
                    cacheList: results
                },
                done
            );
        });
    });

};
