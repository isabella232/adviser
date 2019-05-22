#!/usr/bin/env node

/**
 * @fileoverview CLI that is run via the sentinal command.
 *
 */

'use strict';

const fs = require('fs');

const errorHandler = require('../../core/errors/error-handler');
const cli = require('../cli');
const logger = require('../../utils/logger');

const isInitEnabled = process.argv.indexOf('--init') > -1;
const isDebugEnabled = process.argv.indexOf('--debug') > -1;

if (isDebugEnabled) {
  require('debug').enable('sentinal:*');
}

process.once('uncaughtException', errorHandler.onError);

if (isInitEnabled) {
  const sentinalInitConfigFileTemplate = require('../../core/config/data/init-config-file-template.json');
  fs.writeFile('.sentinalrc', JSON.stringify(sentinalInitConfigFileTemplate, null, 4), function(err) {
    if (err) throw err;
    logger.info('Sentinal created a configuration file called .sentinalrc');
  });
} else {
  process.exitCode = cli.execute(process.argv);
}
