var db = require('../server-files/db');
var q = require('q');			//https://github.com/kriskowal/q (pretty much the same as Angular's $q)
var Utils = require('../server-files/utils');

var councilModel = require('./council');
var chapterlModel = require('./chapter');

//DB fields that are publicly visible
var visibleFields = [
	'Universities_id',
	'Universities_name',
	'Universities_logo',
	'Universities_website',
	'Universities_created',
	'numChapters'
];

var methods = {

	all: function(options){
		var deferred = q.defer();
		
		var wheres = [];
		var params = {};
		
		db.buildWheresParams(['Universities', 'Orgs'], options, wheres, params);
		
		wheres.push('Universities_logo != ""');
		wheres.push('Orgs_crest != ""');
		
		db.fetchAll([
			'select Universities.*, COUNT(Chapters_id) as numChapters',
			'from Universities',
			'join Councils on Councils_joinUniversities_id = Universities_id',
			'join Chapters_x_Councils on Chapters_x_Councils_joinCouncils_id = Councils_id',
			'join Chapters on Chapters_id = Chapters_x_Councils_joinChapters_id',
			'join Orgs on Orgs_id = Chapters_joinOrgs_id',
			db.wheres(wheres),
			'group by Universities_id',
			'order by Universities_name'
		], params).then(function(universities){
			universities = universities.map(function(university){
				return db.filterObject(university, visibleFields);
			});
			
			deferred.resolve(universities);
		});
		
		return deferred.promise;
	},
	
	one: function(options){
		var deferred = q.defer();
		
		var wheres = [];
		var params = {};
		
		db.buildWheresParams(['Universities'], options, wheres, params);
		
		db.fetchOne([
			'select *',
			'from Universities',
			db.wheres(wheres),
			'limit 1'
		], params).then(function(university){
			university = db.filterObject(university, visibleFields)
			
			deferred.resolve(university);
		});
		
		return deferred.promise;
	},
	
	create: function(new_uni){
		var deferred = q.defer()
			errors = [];
		
		if(Utils.isEmpty(new_uni, 'Universities_name')){
			errors.push('Please enter a name.');
		}
		if(Utils.isEmpty(new_uni, 'Universities_fullName')){
			errors.push('Please enter a full name.');
		}
		
		errors.push('this function needs to be updated to work with both default orgs.');
		
		if(errors.length){
			deferred.reject(errors);
		}else{
			var Councils_id;
			var Chapters_id;
			var university;
			db.insert('Universities', new_uni).then(function(_new_university){
				university = _new_university;
				
				//each university requires a default Council (Attached to the default Org)
				return councilModel.create({
					Councils_joinUniversities_id: new_university.Universities_id,
					Councils_name: 'Unaffiliated'
				});
			}).then(function(_new_council){
				Councils_id = _new_council.Councils_id;
				
				//... also a default chapter
				return chapterModel.create({
					Chapters_joinOrgs_id: DEFAULT_ORG_ID,
					Chapters_x_Councils_joinCouncils_id: _new_council.Councils_id,
					Chapters_name: new_uni.Universities_name + ' Student'
				});
			}).then(function(_new_chapter){
				Chapters_id = _new_chapter.Chapters_id;
				
				//then link the new chapter to the new council
				return db.insert('Chapters_x_Councils', {
					Chapters_x_Councils_joinChapters_id: _new_chapter.Chapters_id,
					Chapters_x_Councils_joinCouncils_id: Councils_id
				})
			}).then(function(){
				//and we're finally done!
				deferred.resolve(university);
			});
		}
		
		return deferred.promise;
	},
	
	update: function(Universities_id, update_data){
		var deferred = q.defer()
			errors = [];
		
		if(errors.length){
			deferred.reject(errors);
		}else{
			db.update('Universities', update_data, Universities_id).then(function(university){
				deferred.resolve(university);
			});
		}
		
		return deferred.promise;
	}
}

module.exports = methods;