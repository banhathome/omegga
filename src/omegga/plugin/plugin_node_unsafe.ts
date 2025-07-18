import { Plugin } from '@omegga/plugin';
import type Omegga from '@omegga/server';
import OmeggaPlugin, { PluginStore } from '@/plugin';
import * as util from '@util';
import disrequire from 'disrequire';
import fs from 'fs';
import path from 'path';
import Logger from '@/logger';

global.OMEGGA_UTIL = util;

// Main plugin file (like index.js)
// this isn't named 'index.js' or 'plugin.js' because those may be filenames
// used with other loaders (rpc loader) and are too generic
// omegga.main.js is rather unique and helps avoid collision
const MAIN_FILE = 'omegga.main.js';

// Documentation file (contains name, description, author, command helptext)
const DOC_FILE = 'doc.json';
const PLUGIN_FILE = 'plugin.json';

export default class NodePlugin extends Plugin {
  // every node plugin requires the main file and a doc file
  // may evolve this so it checks the contents of the doc file later
  static canLoad(pluginPath: string) {
    return (
      fs.existsSync(path.join(pluginPath, MAIN_FILE)) &&
      fs.existsSync(path.join(pluginPath, DOC_FILE))
    );
  }

  // unsafe node plugins (can potentially crash omegga) are powerful
  static getFormat() {
    return 'node_unsafe';
  }

  constructor(pluginPath: string, omegga: Omegga) {
    super(pluginPath, omegga);
    // TODO: validate documentation
    this.documentation = Plugin.readJSON(path.join(pluginPath, DOC_FILE));
    this.pluginConfig = Plugin.readJSON(path.join(pluginPath, PLUGIN_FILE));
    this.pluginFile = path.join(pluginPath, MAIN_FILE);

    // list of registered comands
    this.commands = [];
  }

  // documentation is based on doc.json file
  getDocumentation() {
    return this.documentation;
  }

  // loaded state is based on if the loadedPlugin object is created
  isLoaded() {
    return !!this.loadedPlugin;
  }

  // determing if a command is registered
  isCommand(cmd: string) {
    return this.commands.includes(cmd);
  }

  // require the plugin into the system, run the init func
  async load() {
    const stopPlugin = (reason?: string) => {
      Logger.errorp('error launching node plugin', this.getName(), ':', reason);
      try {
        this.disrequireAll();
      } catch (e) {
        Logger.errorp('error unloading node plugin (2)', this.getName(), e);
      }
      this.emitStatus();
      return false;
    };
    this.commands = [];

    try {
      const config = await this.storage.getConfig();
      if (this.pluginConfig?.emitConfig) {
        await fs.promises.writeFile(
          path.join(this.path, this.pluginConfig.emitConfig),
          JSON.stringify(config),
        );
      }

      // require the plugin itself
      const Plugin: OmeggaPlugin = require(this.pluginFile);

      // node plugins must export a class with a constructor
      if (
        typeof (Plugin as any).prototype !== 'object' ||
        typeof (Plugin as any).prototype.constructor !== 'function'
      )
        return stopPlugin();

      // interface with plugin store
      const store: PluginStore = {
        get: key => this.storage.get(key),
        set: (key, value) => this.storage.set(key, value),
        delete: key => this.storage.delete(key),
        wipe: () => this.storage.wipe(),
        count: () => this.storage.count(),
        keys: () => this.storage.keys(),
      };

      // create the loaded plugin
      this.loadedPlugin = new (Plugin as any)(this.omegga, config, store);

      // start the loaded plugin
      if (typeof this.loadedPlugin.init === 'function') {
        const result = await this.loadedPlugin.init();

        // plugins can return a result object
        if (typeof result === 'object' && result) {
          // if registeredCommands is in the results, register the provided strings as commands
          const cmds = result.registeredCommands;
          if (
            cmds &&
            cmds instanceof Array &&
            cmds.every(i => typeof i === 'string')
          )
            this.commands = cmds;
        }
      }

      this.emitStatus();
      return true;
    } catch (e) {
      Logger.errorp('error loading node plugin', this.getName(), e);
      this.emitStatus();
      return false;
    }
  }

  // disrequire the plugin into the system, run the stop func
  async unload() {
    // can't unload the plugin if it hasn't been loaded
    if (typeof this.loadedPlugin === 'undefined') {
      this.emitStatus();
      return false;
    }

    try {
      // run the stop func on the plugin if applicable
      if (typeof this.loadedPlugin.stop === 'function')
        await this.loadedPlugin.stop();

      // unload the plugin
      this.disrequireAll();
      this.loadedPlugin = undefined;
      this.emitStatus();
      this.commands = [];
      return true;
    } catch (e) {
      Logger.errorp('error unloading node plugin', this.getName(), e);
      this.emitStatus();
      return false;
    }
  }

  // disrequire all that match plugin path in require.cache
  disrequireAll() {
    // get all files in plugin directory from require cache
    const requiredFiles = Object.keys(require.cache).filter(requiredFile =>
      requiredFile.includes(this.path),
    );
    // disrequire all the files
    requiredFiles.forEach(file => {
      try {
        disrequire(file);
      } catch (e) {
        if (e.code !== 'MODULE_NOT_FOUND')
          // ignore error thrown if a module was deleted
          throw e;
      }
    });
  }
}
