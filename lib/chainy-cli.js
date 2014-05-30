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
var getPackageData = function(){
	var fsUtil = require('fs')
	if ( fsUtil.existsSync(packagePath) === false ) {
		fsUtil.writeFileSync(packagePath, '{}')
	}
	var packageData = require(packagePath)
	return packageData
}


var Chainy = require('chainy-core').subclass().require('exec')

Chainy
	// use the local npm version, to ensure they are using the latest npm version
	// as a lot of the time, people forget to upgrade npm
	.addExtension('installplugin', 'action', function(name,next){
		console.log('Attempting to install the plugin: '+name)
		this.create().require('exec').set(modules+'/.bin/npm install --save chainy chainy-core chainy-plugin-'+name).exec({stdio:'inherit'}).done(function(err){
			if (err)  return next(err)
			console.log('Successfully installed the plugin: '+name)
			return next()
		})
	})
	.addExtension('installbundle', 'action', function(name,next){
		console.log('Attempting to install the bundle: '+name)
		this.create().require('exec').set(modules+'/.bin/npm install --save chainy chainy-core chainy-bundle-'+name).exec({stdio:'inherit'}).done(function(err){
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
		var packageData = getPackageData()
		Object.keys(packageData.dependencies || {}).forEach(function(dependency){
			if ( dependency.indexOf('chainy-plugin-') === 0 ) {
				args.push('-r', dependency)
			}
		})
		console.log('Browserifying with arguments:', args)
		return this.create().require('exec').set([modules+'/.bin/browserify'].concat(args)).exec({stdio:'inherit'}).done(next)
	})
	.addExtension('scaffoldgit', 'action', function(remote,next){
		this.create().require('exec map')
			.set([
				'git init',
				'git remote rm base',
				'git remote add base '+remote,
				'git pull base master --force'
			])
			.map(function(command, next){
				this.create().set(command).exec().done(function(){
					next() // ignore errors
				})
			})
			.done(next)
	})
	.addExtension('prompt', 'action', function(question,opts,next){
		if ( opts == null )  opts = {}
		if ( opts.method == null )  opts.method = 'prompt'
		require('promptly')[opts.method](question, opts, next)
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
		// @TODO: ask for keywords at some point
		this.create().require('exec')
			.set('https://github.com/chainyjs/base-plugin.git').scaffoldgit()
			.set([
				"What is the name that you would like to give your plugin? E.g. myplugin",
				"What is the GitHub URL of the repository you've created for your plugin? E.g. https://github.com/username/myplugin",
				"What is the copyright information of this plugin? E.g. 2014+ Bevry Pty Ltd <us@bevry.me> (http://bevry.me)",
				"What license would you like this plugin to go under? E.g. MIT"
			])
			.map(function(prompt,next){
				this.create().set(prompt+'\n> ').prompt().done(next)
			})
			.action(function(prompts, next){
				var packageData = getPackageData()
				packageData.name = 'chainy-plugin-'+prompts[0]
				packageData.title = prompts[0]+' plugin for [ChainyJS](http://chainy.bevry.me)'
				packageData.homepage = prompts[1]
				packageData.bugs.url = prompts[1]+'/issues'
				packageData.repository.url = prompts[1]+'.git'
				packageData.author = prompts[2]
				packageData.license = prompts[3]
				require('fs').writeFile(packagePath, JSON.stringify(packageData, null, '  '), next)
			})
			.set(modules+'/.bin/npm install').exec()
			.set(modules+'/.bin/projectz compile').exec()
			.done(next)
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
		this.create().require('exec map')
			.set('https://github.com/chainyjs/base-bundle.git').scaffoldgit()
			.set([
				"What are the names of the plugins that you would like to include in your bundle? E.g. log count",
				"What is the name that you would like to give your bundle? E.g. mybundle",
				"What is the GitHub URL of the repository you've created for your plugin? E.g. https://github.com/username/mybundle",
				"What is the copyright information of this plugin? E.g. 2014+ Bevry Pty Ltd <us@bevry.me> (http://bevry.me)",
				"What license would you like this plugin to go under? E.g. MIT"
			])
			.map(function(prompt,next){
				this.create().set(prompt+'\n> ').prompt().done(next)
			})
			.action(function(prompts, next){
				var packageData = getPackageData()
				if ( !packageData.peerDependencies )  packageData.peerDependencies = {}
				prompts[0].split(/[, ]+/).forEach(function(dep){
					packageData.peerDependencies['chainy-plugin-'+dep] = '*'
				})
				packageData.name = 'chainy-bundle-'+prompts[1]
				packageData.title = prompts[1]+' bundle for [ChainyJS](http://chainy.bevry.me)'
				packageData.homepage = prompts[2]
				packageData.bugs.url = prompts[2]+'/issues'
				packageData.repository.url = prompts[2]+'.git'
				packageData.author = prompts[3]
				packageData.license = prompts[4]
				require('fs').writeFile(packagePath, JSON.stringify(packageData, null, '  '), next)
			})
			.set(modules+'/.bin/npm install').exec()
			.set(modules+'/.bin/projectz compile').exec()
			.done(next)
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