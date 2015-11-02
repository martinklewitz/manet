"use strict";

var fs = require('fs-extra'),
    joi = require('joi'),
    path = require('path'),
    logger = require('winston'),
    childProcess = require('child_process');

const URL_PREFIX_HTTP = 'http://',
      URL_PREFIX_HTTPS = 'https://';


/* URI & URL */

function fixUrl(url) {
    if (url) {
        let http = url.indexOf(URL_PREFIX_HTTP) >= 0,
            https = url.indexOf(URL_PREFIX_HTTPS) >= 0;

        return (http || https) ? url : (URL_PREFIX_HTTP + url);
    }
    return null;
}


/* Validation */

function validate(object, schema) {
    return joi.validate(object, schema, {
        allowUnknown: true
    });
}


/* BASE64 functions */

function encodeBase64(json) {
    let text = JSON.stringify(json),
        buffer = new Buffer(text, 'binary');

    return buffer.toString('base64');
}


/* Functions to work with FS */

function filePath(file, dir) {
    return path.normalize(path.join(dir || __dirname, file));
}

function processOldFile(filePath, timeout, callback) {
    fs.stat(filePath, (err, stat) => {
        if (err) {
            logger.error(err);
        } else {
            let now = new Date().getTime(),
                endTime = new Date(stat.ctime).getTime() + timeout;

            if (now > endTime) {
                callback(filePath);
            }
        }
    });
}

function runFsWatchdog(dir, timeout, callback) {
    if (dir && (timeout > 0)) {
        logger.info('Initialize FS watchdog: directory: %s, timeout: %d', dir, timeout);

        return setInterval(() => {
            fs.readdir(dir, (err, files) => {
                if (err) {
                    logger.error(err);
                } else {
                    files.forEach((file) =>
                        processOldFile(path.join(dir, file), timeout, callback));
                }
            });
        }, timeout);
    }
    return null;
}


/* Functions to work with processes */

function execProcess(command, options, onClose) {
    let procStart = process.hrtime(),
        cmd = command.join(' '),
        opts = options || {};

    childProcess.exec(cmd, opts, (error, stdout, stderr) => {
        let procEnd = process.hrtime(procStart),
            end = (procEnd[0] + procEnd[1] / 1e9).toFixed(2);

        logger.debug('Process output: %s', stdout);
        if (error) {
            logger.error('Process error: %s', stderr);
        }
        logger.debug('Execution time: %d sec', end);

        if (onClose) {
            onClose(error);
        }
    });
}


/* Exported functions */

module.exports = {
    fixUrl: fixUrl,
    validate: validate,
    encodeBase64: encodeBase64,
    filePath: filePath,
    runFsWatchdog: runFsWatchdog,
    execProcess: execProcess
};
