/* jshint multistr:true */
"use strict";
require('longjohn')

// Define our usage
var fixtures = require('./chainy-fixtures')
var extendr = require('extendr')
var pathUtil = require('path')
var mkdirp = require('mkdirp')
var nopt = require('nopt')
var fsUtil = require('fs')
var inquirer = require('inquirer')
var cwd = process.cwd()
var cliModules = __dirname+'/../node_modules'
// var cwdModules = cwd+'/../node_modules'
var packagePath = cwd+'/package.json'
var getPackageData = function(){
	if ( fsUtil.existsSync(packagePath) === false ) {
		fsUtil.writeFileSync(packagePath, '{}')
	}
	var packageData = require(packagePath)
	return packageData
}


var Chainy = require('chainy-core').subclass().require('exec map')

Chainy
	// use the local npm version, to ensure they are using the latest npm version
	// as a lot of the time, people forget to upgrade npm
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
		var packageData = getPackageData()
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
	.addExtension('createplugin', 'action', function(args,next){
		// Fetch current package.json data
		var packageData, user, plugin
		packageData = getPackageData()
		user = {}
		plugin = {
			name: pathUtil.basename(cwd)
		}

		// Start our scaffolding
		this.create()
			// Fetch information about the user
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
			.action(function(_user, next){
				extendr.extend(user, _user)

				// Fetch information from the user
				this.create()
					.set([{
						name: 'name',
						message: "What name would you like for your plugin?",
						'default': plugin.name.replace(/[^a-z]/, ''),
						validate: function(value){
							return /^[a-z]+$/.test(value)
						}
					},{
						type: 'list',
						name: 'type',
						message: 'What type of extension is your plugin?',
						choices: ['action', 'utility', 'custom'],
						validate: 'required'
					}])
					.inquire()
					.done(next)
			})
			.action(function(_plugin, next){
				extendr.extend(plugin, _plugin)
				this.create()
					.set([{
						name: 'description',
						message: "What description would you like for your plugin?",
						validate: 'required'
					},{
						type: 'checkbox',
						name: 'keywords',
						message: 'What keywords describe your plugin?',
						choices: [{
							name: 'setter',
							value: "for extensions that set the chain's data"
						},{
							name: 'modifier',
							value: "for extensions that modify the chain's data"
						},{
							name: 'iterator',
							value: "for extensions that iterate over data within the chain"
						}]
					},{
						name: 'otherKeywords',
						message: "What generic keywords describe your plugin?"
					},{
						name: 'repo',
						message: "What is the GitHub username and repository where this plugin will be stored?",
						validate: 'required',
						'default': user.username+'/'+plugin.name
					},{
						name: 'author',
						message: "What is the copyright information of this plugin?",
						validate: 'required',
						'default': user.name+' <'+user.email+'> (https://github.com/'+user.username+')'
					},{
						name: 'license',
						message: "What license would you like this plugin to go under?",
						'default': 'MIT',
						validate: 'required'
					}])
					.inquire()
					.done(next)
			})

			// Apply the information to the package.json file
			.action(function(_plugin, next){
				extendr.extend(plugin, _plugin)

				packageData.name = 'chainy-plugin-'+plugin.name
				packageData.title = plugin.name+' plugin for [ChainyJS](http://chainy.bevry.me)'
				packageData.description = plugin.description
				packageData.homepage = 'https://github.com/'+plugin.repo
				packageData.license = plugin.license
				packageData.keywords = ['chainy', 'chainy-addon', 'chainy-plugin', 'chainy-'+plugin.type].concat(plugin.keywords).concat(plugin.otherKeywords.split(/[, ]+/))
				packageData.badges = {
				    "travis": true,
				    "npm": true,
				    "david": true,
				    "daviddev": true
				}
				packageData.bugs = {url: packageData.homepage+'/issues'}
				packageData.directories = {
					"lib": "./lib",
					"test": "./test"
				}
				packageData.repository = {type:'git', url:packageData.homepage+'.git'}
				packageData.author = plugin.author
				packageData.maintainers = []
				packageData.contributors = []
				packageData.dependencies = {}
				packageData.peerDependencies = {}
				packageData.devDependencies = {projectz:'~0.3.11'}
				
				var mainPath, testPath;
				mainPath = "./lib/"+plugin.name+".js"
				testPath = "./test/"+plugin.name+"-test.js";
				packageData.scripts = {test: "node "+testPath}
				packageData.main = mainPath

				var mainData, testData, usageData, readmeData;
				mainData = fixtures[plugin.type+'Main'].replace(/NAME/g, plugin.name)
				testData = fixtures[plugin.type+'Test'].replace(/NAME/g, plugin.name)
				usageData = fixtures[plugin.type+'Usage'].replace(/NAME/g, plugin.name)
				readmeData = fixtures.readme.replace('USAGE', usageData)

				this.create()
					.set(packagePath).writefile(JSON.stringify(packageData, null, '  '))
					.set(cwd+'/'+packageData.main).writefile(mainData)
					.set(cwd+'/'+testPath).writefile(testData)
					.set(cwd+'/README.md').writefile(readmeData)
					.done(next)
			})

			// Update the base files
			.set([
				'https://raw.github.com/bevry/base/master/.gitignore',
				'https://raw.github.com/bevry/base/master/.npmignore',
				'https://raw.github.com/bevry/base/master/.travis.yml',
				'https://raw.github.com/bevry/base/master/Cakefile',
				'https://raw.github.com/bevry/base/master/LICENSE.md',
				'https://raw.github.com/bevry/base/master/CONTRIBUTING.md'
			])
			.map(function(url,next){
				this.create().set(url).wget().done(next)
			}, {concurrency:0})

			// Install node modules
			.set(cliModules+'/.bin/npm install').exec({stdio:'inherit'})

			// Compile meta files
			.set(cliModules+'/.bin/projectz compile').exec({stdio:'inherit'})

			// Done
			.done(next)
	})
	.addExtension('createbundle', 'action', function(args,next){
		this.create()
			.set('https://github.com/chainyjs/base-bundle.git').scaffoldgit()
			.set([{
				name: 'plugins',
				message: "What are the names of the plugins that you would like to include in your bundle?\nE.g. log, count"
			},{
				name: 'name',
				message: "What is the name that you would like to give your plugin?\nE.g. myplugin"
			},{
				name: 'url',
				message: "What is the GitHub URL of the repository you've created for your plugin?\nE.g. https://github.com/username/myplugin"
			},{
				name: 'author',
				message: "What is the copyright information of this plugin?\nE.g. 2014+ Bevry Pty Ltd <us@bevry.me> (http://bevry.me)"
			},{
				name: 'license',
				message: "What license would you like this plugin to go under?",
				'default': 'MIT'
			}])
			.inquire()
			.action(function(prompts, next){
				var packageData = getPackageData()
				if ( !packageData.peerDependencies )  packageData.peerDependencies = {}
				prompts[0].split(/[, ]+/).forEach(function(dep){
					packageData.peerDependencies['chainy-plugin-'+dep] = '*'
				})
				packageData.name = 'chainy-bundle-'+prompts[1]
				packageData.title = prompts[1]+' bundle for [ChainyJS](http://chainy.bevry.me)'
				packageData.description = 'Chainy bundle of the '+prompts[0].join(', ')+' plugins'
				packageData.homepage = prompts[2]
				packageData.bugs.url = prompts[2]+'/issues'
				packageData.repository.url = prompts[2]+'.git'
				packageData.author = prompts[3]
				packageData.license = prompts[4]
				fsUtil.writeFile(packagePath, JSON.stringify(packageData, null, '  '), next)
			})
			.set(cliModules+'/.bin/npm install').exec({stdio:'inherit'})
			.set(cliModules+'/.bin/projectz compile').exec({stdio:'inherit'})
			.done(next)
	})

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