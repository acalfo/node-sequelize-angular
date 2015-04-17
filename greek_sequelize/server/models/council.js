var db = require('../server-files/db');
var q = require('q');			//https://github.com/kriskowal/q (pretty much the same as Angular's $q)
var Utils = require('../server-files/utils');

//DB fields that are publicly visible
var visibleFields = [
	'Councils_id',
	'Councils_name',
	'Councils_website',
	'Councils_created',
	'Universities_name'
];

var methods = {

	get: function(options){
		var deferred = q.defer();
		
		var wheres = [];
		var params = {};
		
		db.buildWheresParams(['Councils', 'Universities'], options, wheres, params);
		
		//exclude unaffiliated councils
		wheres.push('Chapters_id is null');
		
		db.fetchAll([
			'select *',
			'from Councils',
			'join Universities on Universities_id = Councils_joinUniversities_id',
			
			//exclude unaffiliated councils
			'left join (',
			'	select Chapters_x_Councils_joinCouncils_id, Chapters_id',
			'	from Chapters_x_Councils',
			'	join Chapters on',
			'		Chapters_id = Chapters_x_Councils_joinChapters_id',
			'		and Chapters_joinOrgs_id in(' + db.escapeIn([DEFAULT_FRATERNITY_ORG_ID, DEFAULT_SORORITY_ORG_ID]) + ')',
			'	) as unaffiliated_councils on Chapters_x_Councils_joinCouncils_id = Councils_id',
			
			db.wheres(wheres)
		], params).then(function(councils){
			councils = councils.map(function(council){
				return db.filterObject(council, visibleFields);
			});
			
			deferred.resolve(councils);
		});
		
		return deferred.promise;
	},
	
	create: function(new_council){
		var deferred = q.defer()
			errors = [];
		
		
		if(Utils.isEmpty(new_council, 'Councils_joinUniversities_id')){
			errors.push('ERROR: Please select a University.');
		}
		if(Utils.isEmpty(new_council, 'Councils_name')){
			errors.push('ERROR: Please enter a name.');
		}
		
		if(errors.length){
			deferred.reject(errors);
		}else{
			db.insert('Councils', new_council).then(function(_new_council){
				deferred.resolve(_new_council);
			});
		}
		
		return deferred.promise;
	}
}

module.exports = methods;