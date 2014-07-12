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
	var bundle = {
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
					message: "What name would you like for your bundle?",
					'default': bundle.name.replace(/[^a-z]/, ''),
					validate: function(value){
						return /^[a-z]+$/.test(value)
					}
				}])
				.inquire()
				.done(next)
		})
		.action(function(_bundle, next){
			extendr.extend(bundle, _bundle)
			this.create()
				.set([{
					name: 'plugins',
					message: "What are the names of the plugins that you would like to include in your bundle?\nE.g. log, count"
				},{
					name: 'otherKeywords',
					message: "What generic keywords describe your bundle?"
				},{
					name: 'repo',
					message: "What is the GitHub username and repository where this bundle will be stored?",
					validate: 'required',
					'default': user.username+'/'+bundle.name
				},{
					name: 'author',
					message: "What is the copyright information of this bundle?",
					validate: 'required',
					'default': user.name+' <'+user.email+'> (https://github.com/'+user.username+')'
				},{
					name: 'license',
					message: "What license would you like this bundle to go under?",
					'default': 'MIT',
					validate: 'required'
				}])
				.inquire()
				.done(next)
		})

		// Apply the information to the package.json file
		.action(function(_bundle, next){
			extendr.extend(bundle, _bundle)

			bundle.plugins = bundle.plugins.split(/[, ]+/)

			packageData.name = 'chainy-bundle-'+bundle.name
			packageData.title = bundle.name+' bundle for [ChainyJS](http://chainyjs.org)'
			packageData.description = 'Chainy bundle for the '+bundle.plugins.join(', ')+' plugins'
			packageData.homepage = 'https://github.com/'+bundle.repo
			packageData.license = bundle.license
			packageData.keywords = ['chainy', 'chainy-addon', 'chainy-bundle'].concat(bundle.otherKeywords.split(/[, ]+/))
			packageData.badges = {
			    "travis": true,
			    "npm": true,
			    "david": true,
			    "daviddev": true
			}
			packageData.bugs = {url: packageData.homepage+'/issues'}
			packageData.repository = {type:'git', url:packageData.homepage+'.git'}
			packageData.author = bundle.author
			packageData.maintainers = []
			packageData.contributors = []
			packageData.dependencies = {}
			packageData.peerDependencies = {}
			packageData.devDependencies = {projectz:'~0.3.14'}

			bundle.plugins.forEach(function(dep){
				packageData.peerDependencies['chainy-plugin-'+dep] = '*'
			})
			var usageData = fixtures.bundleUsage.replace('NAME', bundle.name).replace('PLUGINS', bundle.plugins.join(' '))
			var readmeData = fixtures.readme.replace('USAGE', usageData)

			this.create()
				.set(packagePath).writefile(JSON.stringify(packageData, null, '  '))
				.set(cwd+'/README.md').writefile(readmeData)
				.done(next)
		})

		// Update the base files
		.set([
			'https://raw.githubusercontent.com/bevry/base/master/.editorconfig'
		])
		.map(function(url,next){
			this.create().set(url).curl().done(next)
		}, {concurrency:0})

		// Install node modules
		.set(cliModules+'/.bin/npm install').exec({stdio:'inherit'})

		// Compile meta files
		.set(cliModules+'/.bin/projectz compile').exec({stdio:'inherit'})

		// Done
		.done(next)
}
module.exports.extensionType = 'action'