/* jshint multistr:true */
var usage = 'Usage:\n\
	chainy install-plugin <name>\n\
	chainy install-bundle <name>\n\
	chainy install <name>\n\
	chainy browserify ...'

/* TODO:
chainy create-plugin
chainy create-bundle
chainy browserify
*/

var modules = __dirname+'/../node_modules'
var packagePath = process.cwd()+'/package.json'
var fsUtil = require('fs')
if ( fsUtil.existsSync(packagePath) === false ) {
	fsUtil.writeFileSync(packagePath, '{}')
}
var packageData = require(packagePath)


var Chainy = require('chainy-core').subclass().require('exec');

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

Chainy.create()
	.set(process.argv)
	.nopt()
	.action(function(argv, next){
		var action = argv.remain[0]
		if ( !action || action === 'help' || '--help'.indexOf(argv.cooked) !== -1 ) {
			console.log(usage)
			next(null, true)
		}
		else if ( action === 'browserify' ) {
			this.create().set(argv.cooked).browserify().done(next)
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
		else {
			var err = new Error('unknown action: '+action)
			next(err, false)
		}
	})