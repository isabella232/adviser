/**
 * @fileoverview Sentinal Config file logic.
 *
 */

'use strict';

const path = require('path');
const cosmiconfig = require('cosmiconfig');

const ConfigFileNotFoundError = require('../errors/exceptions/config-file-not-found-error');
const ConfigFilePathNotFoundError = require('../errors/exceptions/config-file-path-not-found-error');
const ConfigFileValidationError = require('../errors/exceptions/config-file-validation-error');

const configFileSchema = require('./data/config-file-schema.json');
const SchemaValidator = require('./schema-validator');
const Plugins = require('./plugins');
const Rules = require('./rules');

const MODULE_NAME = 'sentinal';

class Config {
  constructor(currentDirectory, configFilePath) {
    this.currentDirectory = currentDirectory;
    this.configFilePath = configFilePath;

    this._configFileExplorer = cosmiconfig(MODULE_NAME);
    let foundConfigFile = null;

    if (configFilePath) {
      foundConfigFile = this.loadConfigFileFromPath(configFilePath);
    } else {
      foundConfigFile = this.searchConfigFile(currentDirectory);
    }

    // const schemaValidator = new SchemaValidator(foundConfigFile.config, foundConfigFile.filepath);
    const schemaValidator = new SchemaValidator(configFileSchema, foundConfigFile.config);

    if (!schemaValidator.isValid()) {
      const schemaErrors = schemaValidator.getOutputFormattedErrors();
      throw new ConfigFileValidationError('Invalid Sentinal Configuration file', configFilePath, schemaErrors);
    }

    this.plugins = new Plugins(currentDirectory);

    // Load the plugins
    if (foundConfigFile.config.plugins) {
      this.plugins.loadAll(foundConfigFile.config.plugins);
    }

    this.rules = new Rules();
    this.pluginRules = [];

    // Load the rules defined in the plugins
    Object.keys(this.plugins.getAll()).forEach(pluginName => {
      const plugin = this.plugins.get(pluginName);
      if (plugin.rules) {
        Object.keys(plugin.rules).forEach(ruleId => {
          const qualifiedRuleId = `${pluginName}/${ruleId}`;
          const rule = plugin.rules[ruleId];

          this.pluginRules.push({
            pluginName,
            ruleId,
            qualifiedRuleId,
            rule
          });
        });
      }
    });

    if (foundConfigFile.config.rules) {
      Object.keys(foundConfigFile.config.rules).forEach(ruleName => {
        // Validate the rules than don't belong
        const normalizedRuleName = ruleName.indexOf('sentinal-plugin') < 0 ? `sentinal-plugin-${ruleName}` : ruleName;
        const pluginRule = this.pluginRules.find(pluginRule => pluginRule.qualifiedRuleId === normalizedRuleName);

        if (!pluginRule) {
          throw new Error(`The rule ${ruleName} was not found`);
        }

        // TODO: Validate the rules matches with the rule schema

        // Define the rule
        this.rules.add(pluginRule.qualifiedRuleId, pluginRule.rule, foundConfigFile.config.rules[ruleName]);
      });
    }
  }

  loadConfigFileFromPath(exactPath) {
    try {
      return this._configFileExplorer.loadSync(exactPath);
    } catch (error) {
      let targetDirectory = error.path;
      if (!targetDirectory) {
        targetDirectory = path.resolve(exactPath);
      }

      throw new ConfigFilePathNotFoundError(targetDirectory);
    }
  }

  searchConfigFile(initialPath) {
    try {
      return this._configFileExplorer.searchSync(initialPath);
    } catch (error) {
      let targetDirectory = error.path;
      if (!targetDirectory) {
        targetDirectory = path.resolve(initialPath);
      }

      throw new ConfigFileNotFoundError(null, targetDirectory);
    }
  }
}

module.exports = Config;
