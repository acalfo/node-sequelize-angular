var db = require('../server-files/db');
var q = require('q');			//https://github.com/kriskowal/q (pretty much the same as Angular's $q)
var Utils = require('../server-files/utils');

//DB fields that are publicly visible
var visibleFields = [
	'Orgs_id',
	'Orgs_name',
	'Orgs_gender',
	'Orgs_ascii',
	'Orgs_crest',
	'Orgs_details',
	'Orgs_logo',
	'Orgs_moto',
	'Orgs_website',
	'Orgs_created'
];

var methods = {

	all: function(options){
		var deferred = q.defer();
		
		var wheres = [];
		var params = {};
		
		db.buildWheresParams(['Orgs'], options, wheres, params);
		
		wheres.push('Orgs_crest != ""');
		
		wheres.push('Orgs_id not in(:DEFAULT_FRATERNITY_ORG_ID, :DEFAULT_SORORITY_ORG_ID)');
		params.DEFAULT_FRATERNITY_ORG_ID = DEFAULT_FRATERNITY_ORG_ID;
		params.DEFAULT_SORORITY_ORG_ID = DEFAULT_SORORITY_ORG_ID;
		
		db.fetchAll([
			'select *',
			'from Orgs',
			db.wheres(wheres),
		], params).then(function(organizations){
			organizations = organizations.map(function(organization){
				return db.filterObject(organization, visibleFields);
			});
			
			deferred.resolve(organizations);
		});
		
		return deferred.promise;
	},
	
	one: function(options){
		var deferred = q.defer();
		
		var wheres = [];
		var params = {};
		
		db.buildWheresParams(['Orgs'], options, wheres, params);
		
		db.fetchOne([
			'select *',
			'from Orgs',
			db.wheres(wheres),
			'limit 1'
		], params).then(function(org){
			org = db.filterObject(org, visibleFields)
			
			deferred.resolve(org);
		});
		
		return deferred.promise;
	},
	
	create: function(new_org){
		var deferred = q.defer()
			errors = [];
		
		
		if(Utils.isEmpty(new_org, 'Orgs_name')){
			errors.push('ERROR: Please enter a name.');
		}
		
		if(errors.length){
			deferred.reject(errors);
		}else{
			db.insert('Orgs', new_org).then(function(_new_organization){
				deferred.resolve(_new_organization);
			});
		}
		
		return deferred.promise;
	}
}

module.exports = methods;