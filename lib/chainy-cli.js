var usage = 'Usage:\n\
	chainy install-plugin <name>\n\
	chainy install-bundle <name>\n\
	chainy install <name>'

var Chainy = require('chainy-core').subclass().require('exec');

Chainy
	// use the local npm version, to ensure they are using the latest npm version
	// as a lot of the time, people forget to upgrade npm
	.addExtension('installplugin', 'action', function(name,next){
		console.log('Attempting to install the plugin: '+name)
		return this.create().set('./node_modules/npm/bin/npm install --save chainy-plugin-'+name).exec({stdio:'inherit'}).done(next)
	})
	.addExtension('installbundle', 'action', function(name,next){
		console.log('Attempting to install the bundle: '+name)
		return this.create().set('./node_modules/npm/bin/npm install --save chainy-bundle-'+name).exec({stdio:'inherit'}).done(next)
	})
	.addExtension('install', 'action', function(name, next){
		this.create().set(name).installplugin().done(function(err, result){
			if (!err)  return next(err, result)
			this.create().set(name).installbundle().done(next)
		})
	})
	.addExtension('nopt', 'action', function(argv){
		return require('nopt')(argv).argv
	})

Chainy.create()
	.set(process.argv)
	.nopt()
	.action(function(args, next){
		var method = null
		var action = args.remain[0]
		var chain = this.create()
		var actionToMethod = {
			'install-plugin': 'installplugin',
			'install-bundle': 'installbundle',
			'install': 'install'
		}
		if ( !action || action === 'help' || '--help'.indexOf(args.cooked) ) {
			console.log(usage)
		}
		else if ( chain[method = actionToMethod[action]] != null ) {
			chain.set(args.remain[1])[method]().done(function(err, result){
				if ( err ) {
					err = new Error('Failed to install the plugin or bundle: '+name)
					return next(err, false)
				} else {
					console.log('Successfully installed the '+(result.indexOf('bundle') === -1 ? 'plugin' : 'bundle')+': '+ name)
					return next(null, true)
				}
			})
		}
		else {
			var err = new Error('unknown action: '+action)
			return next(err, false)
		}
	})