/* jshint multistr:true */
"use strict";
// Define our usage
var usage = require('heredoc')(function(){/*

Usage:

	chainy install-plugin <name>

		Installs the plugin titled <name>, alias for:
		npm install --save chainy-plugin-<name>

	
	chainy install-bundle <name>

		Installs the bundle title <name>, alias for:
		npm install --save chainy-bundle-<name>

	
	chainy install <name>

		Attempts to install <name> as a plugin, if that fails, try as a bundle


	chainy browserify [optional arguments...]

		Calls the browserify executable, forwarding the arguments you've sent us,
		as well as requiring all the plugins you have installed


	chainy create-plugin
		
		Scaffolds a new plugin structure within the current working directory


	chainy create-bundle
		
		Scaffolds a new bundle structure within the current working directory

*/}).trim()

var modules = __dirname+'/../node_modules'
var packagePath = process.cwd()+'/package.json'
var fsUtil = require('fs')
if ( fsUtil.existsSync(packagePath) === false ) {
	fsUtil.writeFileSync(packagePath, '{}')
}
var packageData = require(packagePath)


var Chainy = require('chainy-core').subclass().require('exec')

Chainy
	// use the local npm version, to ensure they are using the latest npm version
	// as a lot of the time, people forget to upgrade npm
	.addExtension('installplugin', 'action', function(name,next){
		console.log('Attempting to install the plugin: '+name)
		this.create().set(modules+'/.bin/npm install --save chainy chainy-core chainy-plugin-'+name).exec({stdio:'inherit'}).done(function(err){
			if (err)  return next(err)
			console.log('Successfully installed the plugin: '+name)
			return next()
		})
	})
	.addExtension('installbundle', 'action', function(name,next){
		console.log('Attempting to install the bundle: '+name)
		this.create().set(modules+'/.bin/npm install --save chainy chainy-core chainy-bundle-'+name).exec({stdio:'inherit'}).done(function(err){
			if (err)  return next(err)
			console.log('Successfully installed the bundle: '+name)
			return next()
		})
	})
	.addExtension('install', 'action', function(name, next){
		this.create().set(name).installplugin().done(function(err){
			if (!err)  return next()
			this.create().set(name).installbundle().done(next)
		})
	})
	.addExtension('nopt', 'action', function(argv){
		return require('nopt')(argv).argv
	})
	.addExtension('browserify', 'action', function(args,next){
		args = args.slice(1)
		Object.keys(packageData.dependencies || {}).forEach(function(dependency){
			if ( dependency.indexOf('chainy-plugin-') === 0 ) {
				args.push('-r', dependency)
			}
		})
		console.log('Browserifying with arguments:', args)
		return this.create().set([modules+'/.bin/browserify'].concat(args)).exec({stdio:'inherit'}).done(next)
	})
	.addExtension('createplugin', 'action', function(args,next){
		// git init
		// git remote rm base
		// git remote add base https://github.com/chainyjs/base-plugin
		// git pull base master  --force
		// ask for name, github repo url, author, and license
		// update package.json with acquired details
		// npm install
		// run projectz
		// ready for editing
		console.log('not yet implemented')
		return next()
	})
	.addExtension('createbundle', 'action', function(args,next){
		// git init
		// git remote rm base
		// git remote add base https://github.com/chainyjs/base-bundle
		// git pull base master  --force
		// ask for name, bundled plugins, github repo url, author, and license
		// update package.json with acquired details
		// npm install
		// run projectz
		// ready for publishing
		console.log('not yet implemented')
		return next()
	})

Chainy.create()
	.set(process.argv)
	.nopt()
	.action(function(argv, next){
		var action = argv.remain[0]
		if ( !action || action === 'help' || '--help'.indexOf(argv.cooked) !== -1 ) {
			console.log(usage)
			next(null, true)
		}
		else if ( action === 'install-plugin' ) {
			this.create().set(argv.remain[1]).installplugin().done(next)
		}
		else if ( action === 'install-bundle' ) {
			this.create().set(argv.remain[1]).installbundle().done(next)
		}
		else if ( action === 'install' ) {
			this.create().set(argv.remain[1]).install().done(next)
		}
		else if ( action === 'browserify' ) {
			this.create().set(argv.cooked).browserify().done(next)
		}
		else if ( action === 'create-plugin' ) {
			this.create().set(argv.remain[1]).createbundle().done(next)
		}
		else if ( action === 'create-bundle' ) {
			this.create().set(argv.remain[1]).createbundle().done(next)
		}
		else {
			var err = new Error('unknown action: '+action)
			next(err, false)
		}
	})