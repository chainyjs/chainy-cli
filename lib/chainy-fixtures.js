var heredoc = require('heredoc')

// ====================================
// CLI

module.exports.usage = heredoc(function(){/*
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
*/})


// ====================================
// META

module.exports.readme = heredoc(function(){/*
<!-- TITLE -->
<!-- BADGES -->


<!-- CHAINY_DOCUMENTATION/ -->

<!-- DESCRIPTION -->

USAGE

<!-- /CHAINY_DOCUMENTATION -->


<!-- INSTALL -->
<!-- HISTORY -->
<!-- CONTRIBUTE -->
<!-- BACKERS -->
<!-- LICENSE -->
*/})


// ====================================
// MAIN

module.exports.actionMain = heredoc(function(){/*
"use strict";
module.exports = function(currentValue, next){
	// ...
	return next(null, currentValue)
}
module.exports.extensionType = "action"
*/})

module.exports.customMain = heredoc(function(){/*
module.exports = function(chainy){
	// ...
}
module.exports.extensionType = "custom"
*/})

module.exports.utilityMain = heredoc(function(){/*
module.exports = function(){
	// ...
	return this
}
module.exports.extensionType = "utility"
*/})


// ====================================
// TESTS

module.exports.actionTest =
module.exports.utilityTest = heredoc(function(){/*
"use strict";
(function(){
	// Import
	var expect = require('chai').expect,
		joe = require('joe')

	// Test
	joe.describe('NAME plugin', function(describe,it){
		var Chainy = require('chainy-core').subclass().addExtension('NAME', require('../'))

		it("should fire successfully", function(next){
			var chain = Chainy.create()
				.set([1,2,3])
				.NAME()
				.done(function(err, result){
					if (err)  return next(err)
					expect(result).to.deep.equal([1,2,3])
					return next()
				})
		})
	})
})()
*/})

module.exports.customTest = heredoc(function(){/*
"use strict";
(function(){
	// Import
	var expect = require('chai').expect,
		joe = require('joe')

	// Test
	joe.describe('NAME plugin', function(describe,it){
		var Chainy = require('chainy-core').subclass().addExtension('NAME', require('../'))

		it("should fire successfully", function(next){
			var chain = Chainy.create()
				.set([1,2,3])
				.done(function(err, result){
					if (err)  return next(err)
					expect(result).to.deep.equal([1,2,3])
					return next()
				})
		})
	})
})()
*/})


// ====================================
// USAGE

module.exports.actionUsage =
module.exports.utilityUsage = heredoc(function(){/*
``` javascript
require('chainy').create().require("NAME log")
	.set("some data")
	.NAME()
	.log()  // "some data"
```
*/})


module.exports.customUsage = heredoc(function(){/*
``` javascript
require('chainy').create().require("NAME")
```
*/})

module.exports.bundleUsage = heredoc(function(){/*
``` bash
chainy install-bundle NAME
```

``` javascript
require('chainy').create().require("PLUGINS")
```
*/})