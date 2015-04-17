var db = require('../server-files/db');
var q = require('q');
var Utils = require('../server-files/utils');

//DB fields that are publicly visible
var eventVisibleFields = [
	'Events_id',
	'Events_start',
	'Events_end',
	'Events_description',
	'Events_contactInfo',
	'Events_name',
	'Universities_name',
	'Orgs_name',
	'Councils_name',
	'Chapters_name'
];

var methods = {
	
	getVisibleFields: function(){
		return visibleFields;	
	},
	
	/*
	all: function(options){
		var deferred = q.defer();
		
		var wheres = [];
		var params = {};
		
		db.buildWheresParams(['Recruitments', 'Councils', 'Universities'], options, wheres, params);
		
		if(!Utils.isEmpty(options, 'councils_ids')){
			wheres.push('Councils_id in(' + db.escapeIn(options.councils_ids) + ')');
		}
		
		db.fetchAll([
			'select *',
			'from Recruitments',
			'join Councils on Councils_id = Recruitments_joinCouncils_id',
			'join Universities on Universities_id = Councils_joinUniversities_id',
			db.wheres(wheres),
			'order by Recruitments_start desc'
		], params).then(function(recruitments){
			recruitments = recruitments.map(function(recruitment){
				return db.filterObject(recruitment, visibleFields);
			});
			
			deferred.resolve(recruitments);
		});
		
		return deferred.promise;
	},
	*/
	
	/*
	This first gets all of the rows from the Events table matching the options, then it goes through them and does a separate query for each type of event (so, if there are 2 Chapter events, it will do one query which will return both of these events). Then it appends them all together into an array and returns the array.
	*/
	get: function(options){
		var deferred = q.defer();
		
		var wheres = [];
		var params = {};
		
		db.buildWheresParams([
			'Events'
		], options, wheres, params);
		
		db.fetchAll([
			'select *',
			'from Events',
			db.wheres(wheres)
		], params).then(function(events){
			var eventDeferreds = [];
			
			var idsByType = {};
			events.forEach(function(event){
				if(typeof idsByType[event.Events_type] === 'undefined'){
					idsByType[event.Events_type] = [];
				}
				
				idsByType[event.Events_type].push(event.Events_id);
			});
			
			//fetch extra event info per type
			if(!Utils.isEmpty(idsByType, 'university')){
				wheres = [];
				params = {};
				
				db.buildWheresParams([
					'UniversitiyEvents',
					'Universities'
				], options, wheres, params);
				
				wheres.push('Events_id in (' + db.escapeIn(idsByType.university) + ')');
				
				eventDeferreds.push(db.fetchAll([
					'select *',
					'from Events',
					'join UniversityEvents on UniversityEvents_id = Events_id',
					'join Universities on Universities_id = UniversityEvents_joinUniversities_id',
					db.wheres(wheres)
				], params));
			}
			if(!Utils.isEmpty(idsByType, 'org')){
				wheres = [];
				params = {};
				
				db.buildWheresParams([
					'OrgEvents',
					'Orgs',
				], options, wheres, params);
				
				wheres.push('Events_id in (' + db.escapeIn(idsByType.org) + ')');
				
				eventDeferreds.push(db.fetchAll([
					'select *',
					'from Events',
					'join OrgEvents on OrgEvents_id = Events_id',
					'join Orgs on Orgs_id =OrgEvents_joinOrgs_id',
					db.wheres(wheres)
				], params));
			}
			if(!Utils.isEmpty(idsByType, 'council')){
				wheres = [];
				params = {};
				
				db.buildWheresParams([
					'Universities',
					'CouncilEvents',
					'Councils',
					'Universities'
				], options, wheres, params);
				
				wheres.push('Events_id in (' + db.escapeIn(idsByType.council) + ')');
				
				eventDeferreds.push(db.fetchAll([
					'select *',
					'from Events',
					'join CouncilEvents on CouncilEvents_id = Events_id',
					'join Councils on Councils_id = CouncilEvents_joinCouncils_id',
					'join Universities on Universities_id = Councils_joinUniversities_id',
					db.wheres(wheres)
				], params));
			}
			if(!Utils.isEmpty(idsByType, 'chapter')){
				wheres = [];
				params = {};
				
				db.buildWheresParams([
					'Universities',
					'Orgs',
					'Councils',
					'ChapterEvents',
					'Chapters'
				], options, wheres, params);
				
				wheres.push('Events_id in (' + db.escapeIn(idsByType.chapter) + ')');
				
				eventDeferreds.push(db.fetchAll([
					'select *',
					'from Events',
					'join ChapterEvents on ChapterEvents_id = Events_id',
					'join Chapters on Chapters_id = ChapterEvents_joinChapters_id',
					'join Orgs on Orgs_id = Chapters_joinOrgs_id',
					'join Chapters_x_Councils on Chapters_x_Councils_joinChapters_id = Chapters_id',
					'join Councils on Councils_id = Chapters_x_Councils_joinCouncils_id',
					'join Universities on Universities_id = Councils_joinUniversities_id',
					db.wheres(wheres)
				], params));
			}
			
			return q.all(eventDeferreds);
		}).then(function(eventArrays){
			var events = [];
			eventArrays.forEach(function(_events){
				events = events.concat(_events);
			});
			
			events = events.map(function(event){
				return db.filterObject(event, eventVisibleFields);
			});
			
			deferred.resolve(events);
		}).catch(function(error){
			deferred.reject(error);
		});

		return deferred.promise;
	},
	
	//to take some logic out of the api
	//was gonna just use a callback instead of a deferred, but I'll just keep everything consistent
	canUserUpdateEvent: function(Users_id, Events_id){
		var deferred = q.defer();
		
		q.all([
			require('./user').one({
				Users_id: Users_id
			}),
			methods.get({
				Events_id: Events_id
			})
		]).then(function(results){
			var user = results[0];
			var event = results[1];
			
			//for now we'll just make it so the only person that can edit an event is the creator
			if(event.Events_type == 'university' && event.UniversityEvents_joinUniversityUsers_id == user.Users_id){
				return true;
			}
			else if(event.Events_type == 'org' && event.OrgEvents_joinOrgUsers_id == user.Users_id){
				return true;
			}
			else if(event.Events_type == 'council' && event.CouncilEvents_joinCouncilUsers_id == user.Users_id){
				return true;
			}
			else if(event.Events_type == 'chapter' && event.ChapterEvents_joinChapterUsers_id == user.Users_id){
				return true;
			}
			
			return false;
		}).then(function(canUserUpdateEvent){
			deferred.resolve(canUserUpdateEvent);
		}).catch(function(error){
			console.log('error in canUserUpdateEvent: ', error);
			deferred.resolve(false);
		})
		
		return deferred.promise;
	},
	
	//Users_id is the creator of the event
	create: function(Users_id, options){
		var deferred = q.defer();
		var	errors = [];
		var validEventTypes = ['university', 'org', 'council', 'chapter'];
		
		if(Utils.isEmpty(Users_id)){
			errors.push('Users_id is required.');		//this should not even be possible
		}
		if(Utils.isEmpty(options, 'Events_name')){
			errors.push('ERROR: Please enter a name.');
		}
		if(Utils.isEmpty(options, 'Events_start')){
			errors.push('ERROR: Please enter a start date.');
		}
		if(Utils.isEmpty(options, 'Events_end')){
			errors.push('ERROR: Please enter an end date.');
		}
		if(Utils.isEmpty(options, 'Events_description')){
			errors.push('ERROR: Please enter a description.');
		}
		if(Utils.isEmpty(options, 'Events_contactInfo')){
			errors.push('ERROR: Please enter contact info.');
		}
		if(Utils.isEmpty(options, 'Events_code')){
			errors.push('ERROR: Please enter an event code.');
		}
		
		if(Utils.isEmpty(options, 'Events_joinLocations_id')){
			errors.push('Events_joinLocations_id required');
		}
		
		if(Utils.isEmpty(options, 'Events_type') || validEventTypes.indexOf(options.Events_type) === -1){
			errors.push('Events_type must be one of: ' + validEventTypes.join(', '));
		}
		else if(options.Events_type == 'university' && Utils.isEmpty(options, 'Universities_id')){
			errors.push('Universities_id is required.');
		}
		else if(options.Events_type == 'org' && Utils.isEmpty(options, 'Orgs_id')){
			errors.push('Orgs_id is required.');
		}
		else if(options.Events_type == 'council' && Utils.isEmpty(options, 'Councils_id')){
			errors.push('Councils_id is required.');
		}
		else if(options.Events_type == 'chapter' && Utils.isEmpty(options, 'Chapters_id')){
			errors.push('Chapters_id is required.');
		}
		
		if(errors.length){
			deferred.reject(errors);
			return deferred.promise;
		}
		
		var filteredOptions = db.filterObject(options, [
			'Events_type',
			'Events_start',
			'Events_end',
			'Events_description',
			'Events_contactInfo',
			'Events_name',
			'Events_code',
			'Events_joinLocations_id'
		]);
		
		filteredOptions.Events_joinUsers_id = Users_id;

		var event;
		db.insert('Events', filteredOptions).then(function(_event){
			event = _event;

			if(event.Events_type == 'university'){
				return db.insert('UniversityEvents', {
					UniversityEvents_id: event.Events_id,
					UniversityEvents_joinUniversities_id: options.Universities_id
				})
			}
			if(event.Events_type == 'org'){
				return db.insert('OrgEvents', {
					OrgEvents_id: event.Events_id,
					OrgEvents_joinOrgs_id: options.Orgs_id
				})
			}
			if(event.Events_type == 'council'){
				return db.insert('CouncilEvents', {
					CouncilEvents_id: event.Events_id,
					CouncilEvents_joinCouncils_id: options.Councils_id
				})
			}
			if(event.Events_type == 'chapter'){
				return db.insert('ChapterEvents', {
					ChapterEvents_id: event.Events_id,
					ChapterEvents_joinChapters_id: options.Chapters_id
				})
			}

			return false;
		}).then(function(specificEvent){
			console.log(specificEvent);
			if(Utils.isEmpty(specificEvent)){
				deferred.reject('error occurred while creating specific event.');
				return false;
			}

			return methods.get({
				Events_id: event.Events_id
			});
		}).then(function(events){
			deferred.resolve(events[0]);
		}).catch(function(error){
			deferred.reject(error);
		})
		
		return deferred.promise;
	},
	
	update: function(options){
		var deferred = q.defer()
			errors = [];
		
		if(!Utils.isEmpty(options, 'Events_id')){
			errors.push('Events_id is required.');
		}
		if(!Utils.isEmpty(options, 'Events_type')){
			errors.push('Events_type cannot be changed.');
		}
		
		if(errors.length){
			deferred.reject(errors);
		}else{
			db.update('Events', options, options.Events_id).then(function(event){
				deferred.resolve(event);
			}).catch(function(error){
				deferred.reject(error);
			})
		}
		
		return deferred.promise;
	},
	
	checkin: function(Users_id, options){
		var deferred = q.defer();
		var errors = [];
		
		if(!Utils.isEmpty(Users_id)){
			errors.push('Users_id is required.');
		}
		if(!Utils.isEmpty(options, 'Events_id')){
			errors.push('Events_id is required.');
		}
		if(!Utils.isEmpty(options, 'code')){
			errors.push('ERROR: Please enter a checkin code.');
		}
		
		if(errors.length){
			deferred.reject(errors);
			return deferred.promise;
		}
		
		this.get({
			Events_id: options.Events_id
		}).then(function(event){
			if(event.Events_code != options.code){
				throw new Error('ERROR: Code is incorrect.');
			}
			if(!event.Events_afterEndCheckins && Utils.strtotime(event.Events_end) < Utils.strtotime('now')){
				throw new Error('ERROR: Sorry, you can no longer check into this event.');
			}
			
			return db.insert('EventCheckins', {
				EventCheckins_joinUsers_id: Users_id,
				EventCheckins_joinEvents_id: event.Events_id
			});
		}).then(function(checkin){
			deferred.resolve();
		}).catch(function(error){
			deferred.reject(error);
		});
		
		return deferred.promise;
	}
}

module.exports = methods;