"use strict";
module.exports = function(args,next){
	var extendr = require('extendr')
	var pathUtil = require('path')
	var fixtures = require('./chainy-fixtures')
	var cliModules = __dirname+'/../node_modules'
	var cwd = process.cwd()
	var packagePath = cwd+'/package.json'
	var packageData = require(packagePath)
	var user = {}
	var plugin = {
		name: pathUtil.basename(cwd)
	}

	// Start our scaffolding
	this.create()
		.getuserdata()
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
			packageData.title = plugin.name+' plugin for [ChainyJS](http://chainyjs.org)'
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
			packageData.peerDependencies = {"chainy-core": "1"}
			packageData.devDependencies = {projectz:'~0.3.14'}
			
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
			'https://raw.github.com/bevry/base/master/.editorconfig',
			'https://raw.github.com/bevry/base/master/.jshintrc',
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
}
module.exports.extensionType = 'action'