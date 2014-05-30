"use strict";
require('longjohn')  // better errors

// Notes:
// We use the local npm version, to ensure they are using the latest npm version
// as a lot of the time, people forget to upgrade npm

// Import
var pathUtil = require('path')
var mkdirp = require('mkdirp')
var nopt = require('nopt')
var fsUtil = require('fs')
var inquirer = require('inquirer')

// Local
var fixtures = require('./chainy-fixtures')

// Variables
var cwd = process.cwd()
var cliModules = __dirname+'/../node_modules'
var packagePath = cwd+'/package.json'
if ( fsUtil.existsSync(packagePath) === false )  fsUtil.writeFileSync(packagePath, '{}')
var packageData = require(packagePath)

// Chainy
var Chainy = require('chainy-core').subclass().require('exec map')

// Extensions
Chainy
	.addExtension('installplugin', 'action', function(name,next){
		console.log('Attempting to install the plugin: '+name)
		this.create()
			.set(cliModules+'/.bin/npm install --save chainy chainy-core chainy-plugin-'+name)
			.exec({stdio:'inherit'})
			.done(function(err){
				if (err)  return next(err)
				console.log('Successfully installed the plugin: '+name)
				return next()
			})
	})
	.addExtension('installbundle', 'action', function(name,next){
		console.log('Attempting to install the bundle: '+name)
		this.create()
			.set(cliModules+'/.bin/npm install --save chainy chainy-core chainy-bundle-'+name)
			.exec({stdio:'inherit'})
			.done(function(err){
				if (err)  return next(err)
				console.log('Successfully installed the bundle: '+name)
				return next()
			})
	})
	.addExtension('install', 'action', function(name, next){
		this.create()
			.set(name)
			.installplugin()
			.done(function(err){
				if (!err)  return next()
				this.create().set(name).installbundle().done(next)
			})
	})
	.addExtension('nopt', 'action', function(argv){
		return nopt(argv).argv
	})
	.addExtension('browserify', 'action', function(args,next){
		args = args.slice(1)
		Object.keys(packageData.dependencies || {}).forEach(function(dependency){
			if ( dependency.indexOf('chainy-plugin-') === 0 ) {
				args.push('-r', dependency)
			}
		})
		console.log('Browserifying with arguments:', args)
		this.create()
			.set([cliModules+'/.bin/browserify'].concat(args))
			.exec({stdio:'inherit'})
			.done(next)
	})
	.addExtension('scaffoldgit', 'action', function(remote,next){
		this.create()
			.set([
				'git init',
				'git remote rm base',
				'git remote add base '+remote,
				'git pull base master --force'
			])
			.map(function(command, next){
				this.create()
					.set(command)
					.exec()
					.done(function(){
						next() // ignore errors
					})
			})
			.done(next)
	})
	.addExtension('inquire', 'action', function(questions, next){
		questions.forEach(function(question){
			question.message += '\n> '
			if ( question.validate === 'required' )  question.validate = function(item){return !!item}
		})
		inquirer.prompt(questions, function(results){
			return next(null, results)
		})
	})
	.addExtension('writefile', 'action', function(path,data,next){
		mkdirp(pathUtil.dirname(path), function(err){
			if (err)  return next(err)
			fsUtil.writeFile(path, data, next)
		})
	})
	.addExtension('wget', 'action', function(url,next){
		this.create()
			.set('wget '+url)
			.exec()
			.done(next)
	})
	.addExtension('getuserdata', 'action', function(data, next){
		this.create()
			.set({
				name: 'git config user.name',
				username: 'git config github.user',
				email: 'git config user.email'
			})
			.map(function(command, next){
				this.create()
					.set(command)
					.exec()
					.action(function(value){
						return (value || '').replace(/^\s+|\s+$/g, '')
					})
					.done(next)
			})
			.done(next)
	})
	.addExtension('createplugin', require('./chainy-plugin-createplugin'))
	.addExtension('createbundle', require('./chainy-plugin-createbundle'))

// Chain
Chainy.create()
	.set(process.argv)
	.nopt()
	.action(function(argv, next){
		var action = argv.remain[0]
		if ( !action || action === 'help' || '--help'.indexOf(argv.cooked) !== -1 ) {
			console.log(fixtures.usage.trim())
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
			this.create().set(argv.remain[1]).createplugin().done(next)
		}
		else if ( action === 'create-bundle' ) {
			this.create().set(argv.remain[1]).createbundle().done(next)
		}
		else {
			var err = new Error('unknown action: '+action)
			next(err, false)
		}
	})