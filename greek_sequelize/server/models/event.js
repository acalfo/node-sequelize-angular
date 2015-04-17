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
	This first gets all of the rows from the Events table matching the options, then it goes through them and does a separate query for each type of event (so, if there are 2 Recruitment events, it will do one query which will return both of these events). Then it appends them all together into an array and returns the array.
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
			if(!Utils.isEmpty(idsByType, 'recruitment')){
				wheres = [];
				params = {};
				
				db.buildWheresParams([
					'RecruitmentEvents',
					'Recruitments',
					'ChapterRecruitments'
				], options, wheres, params);
				
				wheres.push('Events_id in (' + db.escapeIn(idsByType.recruitment) + ')');
				
				eventDeferreds.push(db.fetchAll([
					'select *',
					'from Events',
					'join RecruitmentEvents on RecruitmentEvents_id = Events_id',
					'join Recruitments on Recruitments_id = RecruitmentEvents_joinRecruitments_id',
					'left join ChapterRecruitments on ChapterRecruitments_id = RecruitmentEvents_joinChapterRecruitments_id',
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
		
		this.get({
			Events_id: Events_id,
			Events_joinUsers_id: Users_id
		}).then(function(events){
			if(Utils.isEmpty(events)){
				deferred.resolve(false);
			}else{
				deferred.resolve(true);
			}
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
		var validEventTypes = ['recruitment'];
		
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
		else if(options.Events_type == 'recruitment' && Utils.isEmpty(options, 'Recruitments_id')){
			errors.push('Recruitments_id is required.');
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

			if(event.Events_type == 'recruitment'){
				return db.insert('RecruitmentEvents', {
					RecruitmentEvents_id: event.Events_id,
					RecruitmentEvents_joinRecruitments_id: options.Recruitments_id
				})
			}

			return false;
		}).then(function(specificEvent){
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
			deferred.resolve(checkin);
		}).catch(function(error){
			deferred.reject(error);
		});
		
		return deferred.promise;
	},
	
	getCheckins: function(options){
		
		var deferred = q.defer();
		
		var wheres = [];
		var params = {};
		
		db.buildWheresParams([
			'EventCheckins',
			'Events',
			'Users',
			'RecruitmentEvents',
			'Recruitments',
			'ChapterRecruitments',
			'Chapters'
		], options, wheres, params);
		
		db.fetchAll([
			'select *',
			'from EventCheckins',
			'join Events on Events_id = EventCheckins_joinEvents_id',
			'join Users on Users_id = EventCheckins_joinUsers_id',
			'join RecruitmentEvents on RecruitmentEvents_id = Events_id',
			'join Recruitments on Recruitments_id = RecruitmentEvents_joinRecruitments_id',
			'left join ChapterRecruitments on ChapterRecruitments_id = RecruitmentEvents_joinChapterRecruitments_id',
			'left join Chapters on Chapters_id = ChapterRecruitments_joinChapters_id',
			db.wheres(wheres)
		], params).then(function(checkins){
			var checkinVisibleFields = eventVisibleFields.concat([
				'EventCheckins_created'
			]).concat(require('./user').getVisibleFields());
			
			checkins = checkins.map(function(checkin){
				return db.filterObject(checkin, checkinVisibleFields);
			});
			
			deferred.resolve(checkins);
		}).catch(function(error){
			deferred.reject(error);
		})
			
		return deferred.promise;
	}
}

module.exports = methods;