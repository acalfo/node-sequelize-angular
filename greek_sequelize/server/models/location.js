var db = require('../server-files/db');
var q = require('q');
var Utils = require('../server-files/utils');

//DB fields that are publicly visible
var locationVisibleFields = [
	'Locations_id',
	'Locations_name',
	'Locations_address',
	'Locations_lat',
	'Locations_lng'
];

var methods = {
	
	getVisibleFields: function(){
		return locationVisibleFields;	
	},
	
	get: function(options){
		var deferred = q.defer();
		
		var wheres = [];
		var params = {};
		
		db.buildWheresParams([
			'Locations'
		], options, wheres, params);
		
		db.fetchAll([
			'select *',
			'from Locations',
			db.wheres(wheres)
		], params).then(function(locations){
			locations = locations.map(function(location){
				return db.filterObject(location, locationVisibleFields);
			});
			
			deferred.resolve(locations);
		}).catch(function(error){
			deferred.reject(error);
		});

		return deferred.promise;
	},
	
	create: function(options){
		var deferred = q.defer();
		var errors = [];
		
		if(Utils.isEmpty(options, 'Locations_name')){
			errors.push('Locations_name required.');
		}
		if(Utils.isEmpty(options, 'Locations_address')){
			errors.push('Locations_address required.');
		}
		if(Utils.isEmpty(options, 'Locations_lat')){
			errors.push('Locations_lat required.');
		}
		if(Utils.isEmpty(options, 'Locations_lng')){
			errors.push('Locations_lng required.');
		}
		if(Utils.isEmpty(options, 'Locations_rawGeocode')){
			errors.push('Locations_rawGeocode required.');
		}
		
		if(errors.length){
			deferred.reject(errors);
			return deferred.promise;
		}
		
		db.insert('Locations', options).then(function(locations){
			locations = locations.map(function(location){
				return db.filterObject(location, locationVisibleFields);
			});
			
			deferred.resolve(locations);
		}).catch(function(error){
			deferred.reject(error);
		});

		return deferred.promise;
	}
}

module.exports = methods;