var db = require('../server-files/db');
var q = require('q');			//https://github.com/kriskowal/q (pretty much the same as Angular's $q)
var Utils = require('../server-files/utils');

var greekrush = require('./greekrush');

//DB fields that are publicly visible
var visibleFields = [
	'Chapters_id',
	'Chapters_joinUniversities_id',
	'Chapters_joinOrgs_id',
	'Chapters_join_users_id_president',
	'Chapters_name',
	//deprecated 'Chapters_details',
	'Chapters_website',
	'Orgs_name',
	'Orgs_ascii_codes',
	'Orgs_info',
	'Orgs_gender',
	'Orgs_crest',
	'Orgs_moto',
	'Orgs_website',
	'Universities_id',
	'Universities_logo',
	'Universities_name',
	'Universities_website',
	'Universities_created'
];

var chapterRecruitmentVisibleFields = [
	'ChapterRecruitments_id',
	'ChapterRecruitments_joinChapters_id',
	'ChapterRecruitments_joinRecruitments_id',
	'ChapterRecruitments_profile'
];

var methods = {

	all: function(options){
		var deferred = q.defer();
		
		var wheres = [];
		var params = {};
		
		db.buildWheresParams(['Chapters', 'Orgs', 'Universities'], options, wheres, params);
		
		//omit default chapters
		wheres.push('Chapters_id not in (select Chapters_id from Chapters where Chapters_joinOrgs_id in(' + db.escapeIn([DEFAULT_FRATERNITY_ORG_ID, DEFAULT_SORORITY_ORG_ID]) + '))');
		
		if(!Utils.isEmpty(options, 'councils_ids')){
			wheres.push('Councils_id in(' + db.escapeIn(options.councils_ids) + ')');
		}
		
		db.fetchAll([
			'select *',
			'from Chapters',
			'join Orgs on Orgs_id = Chapters_joinOrgs_id',
			'join Chapters_x_Councils on Chapters_x_Councils_joinChapters_id = Chapters_id',
			'join Councils on Councils_id = Chapters_x_Councils_joinCouncils_id',
			'join Universities on Universities_id = Councils_joinUniversities_id',
			db.wheres(wheres),
			'order by Orgs_name'
			], params
		).then(function(chapters){
			chapters = chapters.map(function(chapter){
				return db.filterObject(chapter, visibleFields);
			});
			
			deferred.resolve(chapters);
		}).catch(function(error){
			deferred.reject(error);
		});
		
		return deferred.promise;
	},

	one: function(options){
		var deferred = q.defer();
		
		var wheres = [];
		var params = {};
		
		db.buildWheresParams(['Chapters'], options, wheres, params);
		
		if(!Utils.isEmpty(options, 'councils_ids')){
			wheres.push('Councils_id in(' + db.escapeIn(options.councils_ids) + ')');
		}
		
		db.fetchOne([
			'select *',
			'from Chapters',
			'join Orgs on Orgs_id = Chapters_joinOrgs_id',
			'join Chapters_x_Councils on Chapters_x_Councils_joinChapters_id = Chapters_id',
			'join Councils on Councils_id = Chapters_x_Councils_joinCouncils_id',
			'join Universities on Universities_id = Councils_joinUniversities_id',
			db.wheres(wheres) +
			'limit 1'
		], params).then(function(chapter){
			chapter = db.filterObject(chapter, visibleFields)
			
			deferred.resolve(chapter);
		});
		
		return deferred.promise;
	},
	
	create: function(new_chapter){
		var deferred = q.defer()
			errors = [];
		
		//**Server side validation (there are some good validation libraries out there)**
		if(Utils.isEmpty(new_chapter, 'Chapters_joinOrgs_id')){
			errors.push('ERROR: Please select an Organization.');
		}
		if(Utils.isEmpty(new_chapter, 'Chapters_x_Councils_joinCouncils_id')){
			//force every chapter to be part of a council
			errors.push('ERROR: Please select a Council.');
		}
		if(Utils.isEmpty(new_chapter, 'Chapters_name')){
			errors.push('ERROR: Please enter a name.');
		}
		
		if(errors.length){
			deferred.reject(errors);
		}else{
			var chapter;
			db.insert('Chapters', new_chapter).then(function(_new_chapter){
				chapter = _new_chapter;
				
				return db.insert('Chapters_x_Councils', {
					Chapters_x_Councils_joinChapters_id: chapter.Chapters_id,
					Chapters_x_Councils_joinCouncils_id: new_chapter.Chapters_x_Councils_joinCouncils_id
				});
			}).then(function(_new_chapters_x_council){
				deferred.resolve(chapter);
			});
		}
		
		return deferred.promise;
	},
	
	del: function(Chapters_id){
		var deferred = q.defer()
			errors = [];
		
		db.delete('Chapters', Chapters_id).then(function(Chapters_id){
			deferred.resolve();
		});
		
		return deferred.promise;
	},
	
	getRequests: function(options){
		var deferred = q.defer();
		
		var wheres = [];
		var params = {};
		
		db.buildWheresParams(['Chapters', 'ChapterRequests'], options, wheres, params);
		
		db.fetchAll([
			'select *',
			'from ChapterRequests',
			'join Users on Users_id = ChapterRequests_joinUsers_id',
			db.wheres(wheres),
			'order by Users_lastname'
			], params
		).then(function(requests){
			var requestVisibleFields = require('./user').getVisibleFields().concat([
				'ChapterRequests_id',
				'ChapterRequests_status',
				'ChapterRequests_updated'
			]);
			
			requests = requests.map(function(request){
				return db.filterObject(request, requestVisibleFields);
			});
			
			deferred.resolve(requests);
		}).catch(function(errors){
			deferred.reject(errors);
		});
		
		return deferred.promise;
	},
	
	getFollowers: function(options){
		var deferred = q.defer();
		var errors = [];
		
		if(errors.length){
			deferred.reject(errors);
			return deferred.promise;
		}
		
		var wheres = [];
		var params = {};
		
		db.buildWheresParams(['Chapters', 'ChapterFollowers', 'Users'], options, wheres, params);
		
		db.fetchAll([
			'select *',
			'from ChapterFollowers',
			'join Users on Users_id = ChapterFollowers_joinUsers_id',
			'join Chapters on Chapters_id = ChapterFollowers_joinChapters_id',
			db.wheres(wheres),
			'order by Users_lastname, Chapters_name'
		], params).then(function(followers){
			var followerVisibleFields = require('./user').getVisibleFields().concat(visibleFields);
			
			followers = followers.map(function(follower){
				return db.filterObject(follower, followerVisibleFields);
			});
			
			deferred.resolve(followers);
		}).catch(function(errors){
			deferred.reject(errors);
		});
		
		return deferred.promise;
	},
	
	updateRequestsStatuses: function(chapterrequests_ids, ChapterRequests_status, Chapters_id){
		var deferred = q.defer();
		var errors = [];
		
		if(Utils.isEmpty(chapterrequests_ids)){
			errors.push('chapterrequests_ids is missing');
		}
		if(Utils.isEmpty(ChapterRequests_status)){
			errors.push('ChapterRequests_status is missing');
		}
		if(Utils.isEmpty(Chapters_id)){
			errors.push('Chapters_id is missing');
		}
		
		if(errors.length){
			deferred.reject(errors);
		}else{
			db.sql([
				'update ChapterRequests',
				'set ChapterRequests_status = :ChapterRequests_status',
				'where',
				'	ChapterRequests_id in(' + db.escapeIn(chapterrequests_ids) + ')'
			], {
				ChapterRequests_status: ChapterRequests_status
			}).then(function(){
				//if the user is approving requests
				if(ChapterRequests_status == 'approved'){
					return db.sql([
						'update ChapterUsers',
						'join ChapterRequests on',
						'	ChapterRequests_joinUsers_id = ChapterUsers_id',
						'set',
						'	ChapterUsers_joinChapters_id = :Chapters_id,',
						'	ChapterUsers_joinChapterUserRoles_id = ChapterRequests_joinChapterUserRoles_id',
						'where',
						'	ChapterRequests_id in(' + db.escapeIn(chapterrequests_ids) + ')'
					], {
						Chapters_id: Chapters_id
					}).then(function(){
						//need to log all of the changes to ChapterUsers
						db.fetchSinglets([
							'select ChapterRequests_joinUsers_id',
							'from ChapterRequests',
							'where',
							'	ChapterRequests_id in(' + db.escapeIn(chapterrequests_ids) + ')'
						]).then(function(users_ids){
							greekrush.logRow('ChapterUsers', users_ids);
						});
					})
				}
			}).then(function(){
				deferred.resolve();
			}).catch(function(error){
				deferred.reject(error);
			});
		}
		
		return deferred.promise;
	},
	
	//creates a chapter recruitment, not just a recruitment
	createRecruitment: function(options){
		var deferred = q.defer();
		var errors = [];
		
		if(Utils.isEmpty(options, 'Chapters_id')){
			errors.push('Chapters_id required.');
		}
		if(Utils.isEmpty(options, 'Recruitments_id')){
			errors.push('Recruitments_id required.');
		}
		
		if(errors.length){
			deferred.reject(errors);
		}else{
			var chapterRecruitment;
			db.insertIgnore('ChapterRecruitments', {
				ChapterRecruitments_joinChapters_id: options.Chapters_id,
				ChapterRecruitments_joinRecruitments_id: options.Recruitments_id
			}).then(function(_chapterRecruitment){
				chapterRecruitment = _chapterRecruitment;
				
				//if one was actually created
				if(!Utils.isEmpty(chapterRecruitment.ChapterRecruitments_id)){
					//create pnms for this chapter's followers that are currently part of the student-chapter
					return db.sql([
						'insert into ChapterRecruitmentUsers(ChapterRecruitmentUsers_joinChapterRecruitments_id, ChapterRecruitmentUsers_joinUsers_id, ChapterRecruitmentUsers_role)',
						'select :ChapterRecruitments_id, ChapterFollowers_joinUsers_id, "pnm"',
						'from ChapterFollowers',
						'join ChapterUsers on ChapterUsers_id = ChapterFollowers_joinUsers_id',
						'join Chapters on',
						'	Chapters_id = ChapterUsers_joinChapters_id',
						'	and Chapters_joinOrgs_id in(' + db.escapeIn([DEFAULT_FRATERNITY_ORG_ID, DEFAULT_SORORITY_ORG_ID]) + ')',
						'where',
						'	ChapterFollowers_joinChapters_id = :Chapters_id'
					], {
						ChapterRecruitments_id: chapterRecruitment.ChapterRecruitments_id,
						Chapters_id: options.Chapters_id
					});
				}
			}).then(function(){
				chapterRecruitment = db.filterObject(chapterRecruitment, chapterRecruitmentVisibleFields);
				deferred.resolve(chapterRecruitment);
			});
		}
		
		return deferred.promise;
	},
	
	//updates a chapter recruitment, not just a recruitment
	updateRecruitment: function(ChapterRecruitments_id, options){
		var deferred = q.defer();
		var errors = [];
		
		if(Utils.isEmpty(ChapterRecruitments_id)){
			errors.push('ChapterRecruitments_id required.');
		}
		//since ChapterRecruitments_profile is the only chapter recruitment field at the moment, let's require it
		if(Utils.isEmpty(options, 'ChapterRecruitments_profile')){
			errors.push('ChapterRecruitments_profile required.');
		}
		
		if(errors.length){
			deferred.reject(errors);
		}else{
			var chapter;
			db.update('ChapterRecruitments', options, ChapterRecruitments_id).then(function(chapter_recruitment){
				chapter_recruitment = db.filterObject(chapter_recruitment, chapterRecruitmentVisibleFields);
				deferred.resolve(chapter_recruitment);
			});
		}
		
		return deferred.promise;
	},
	
	//gets chapter recruitments, not just recruitments
	getRecruitments: function(options){
		var deferred = q.defer();
		
		var wheres = [];
		var params = {};
		
		db.buildWheresParams(['ChapterRecruitments', 'Recruitments', 'Universities'], options, wheres, params);
		
		db.fetchAll([
			'select *',
			'from ChapterRecruitments',
			'join Recruitments on Recruitments_id = ChapterRecruitments_joinRecruitments_id',
			'join Chapters on Chapters_id = ChapterRecruitments_joinChapters_id',
			'join Chapters_x_Councils on Chapters_x_Councils_joinChapters_id = Chapters_id',
			'join Councils on Councils_id = Chapters_x_Councils_joinCouncils_id',
			'join Universities on Universities_id = Councils_joinUniversities_id',
			db.wheres(wheres),
			'order by Chapters_name'
			], params
		).then(function(chapterRecruitments){
			chapterRecruitments = chapterRecruitments.map(function(chapterRecruitment){
				return db.filterObject(chapterRecruitment, visibleFields.concat(chapterRecruitmentVisibleFields));
			});
			
			deferred.resolve(chapterRecruitments);
		}).catch(function(error){
			deferred.reject(error);
		});
		
		return deferred.promise;
	},
	
	addChapterRecruitmentUsers: function(options){
		var deferred = q.defer();
		var errors = [];
		
		if(Utils.isEmpty(options, 'ChapterRecruitments_id')){
			errors.push('ChapterRecruitments_id required.');
		}
		if(Utils.isEmpty(options, 'chapterusers_ids')){
			errors.push('chapterusers_ids required.');
		}
		if(Utils.isEmpty(options, 'ChapterRecruitmentUsers_role')){
			errors.push('ChapterRecruitmentUsers_role required.');
		}
		
		if(errors.length){
			deferred.reject(errors);
			return deferred.promise;
		}
		
		var deferreds = [];
		options.chapterusers_ids.forEach(function(ChapterUsers_id){
			deferreds.push(db.insertIgnore('ChapterRecruitmentUsers', {
				ChapterRecruitmentUsers_joinChapterRecruitments_id: options.ChapterRecruitments_id,
				ChapterRecruitmentUsers_joinUsers_id: ChapterUsers_id,
				ChapterRecruitmentUsers_role: options.ChapterRecruitmentUsers_role
			}));
		});
		
		q.all(deferreds).then(function(chapterRecruitmentUsers){
			//get a list of chapterrecruitmentusers_ids from the inserts that actually inserted
			var chapterrecruitmentusers_ids = db.getFieldValues(chapterRecruitmentUsers, 'ChapterRecruitmentUsers_id');
			if(chapterrecruitmentusers_ids.length){
				greekrush.logRow('ChapterRecruitmentUsers', chapterrecruitmentusers_ids);
			}
			
			deferred.resolve();
		}).catch(function(error){
			deferred.reject(error);
		});
		
		return deferred.promise;
	},
	
	removeChapterRecruitmentUsers: function(options){
		var deferred = q.defer();
		var errors = [];
		
		if(Utils.isEmpty(options, 'ChapterRecruitments_id')){
			errors.push('ChapterRecruitments_id required.');
		}
		if(Utils.isEmpty(options, 'chapterusers_ids')){
			errors.push('chapterusers_ids required.');
		}
		
		if(errors.length){
			deferred.reject(errors);
			return deferred.promise;
		}
		
		db.sql([
			'delete from ChapterRecruitmentUsers',
			'where',
			'	ChapterRecruitmentUsers_joinUsers_id in(' + db.escapeIn(options.chapterusers_ids) + ')',
			'	and ChapterRecruitmentUsers_joinChapterRecruitments_id = :ChapterRecruitments_id'
		], {
			ChapterRecruitments_id: options.ChapterRecruitments_id
		}).then(function(){
			deferred.resolve();
		}).catch(function(error){
			deferred.reject(error);
		})
		
		return deferred.promise;
	},
	
	getChapterRecruitmentUsers: function(options){
		var deferred = q.defer();
		var errors = [];
		
		if(Utils.isEmpty(options, 'ChapterRecruitments_id')){
			errors.push('ChapterRecruitments_id required.');
		}
		
		if(errors.length){
			deferred.reject(errors);
			return deferred.promise;
		}
		
		var wheres = [];
		var params = {};
		
		db.buildWheresParams(['ChapterRecruitmentUsers', 'ChapterRecruitments', 'Recruitments', 'Users'], options, wheres, params);
		
		db.fetchAll([
			'select *',
			'from ChapterRecruitmentUsers',
			'join ChapterRecruitments on ChapterRecruitments_id = ChapterRecruitmentUsers_joinChapterRecruitments_id',
			'join Recruitments on Recruitments_id = ChapterRecruitments_joinRecruitments_id',
			'join Users on Users_id = ChapterRecruitmentUsers_joinUsers_id',
			db.wheres(wheres),
			'order by Users_lastname'
			], params
		).then(function(users){
			var chapterRecruitmentUsersVisibleFields = require('./recruitment').getVisibleFields().concat(require('./user').getVisibleFields()).concat([
				'ChapterRecruitmentUsers_role'
			]);
			users = users.map(function(user){
				return db.filterObject(user, chapterRecruitmentUsersVisibleFields);
			});
			
			deferred.resolve(users);
		}).catch(function(error){
			deferred.reject(error);
		});
		
		return deferred.promise;
	},
	
	//adds the user as a pnm for this chapter's active recruitment if they are following the chapter, or if they have checked into one of the chapter's recruitment events
	addOrRemovePnm: function(Users_id, Chapters_id){
		var deferred = q.defer();
		var errors = [];
		var recruitmentModel = require('./recruitment');
		var userModel = require('./user');
		var eventModel = require('./event');
		
		if(Utils.isEmpty(Users_id)){
			errors.push('Users_id required.');
		}
		if(Utils.isEmpty(Chapters_id)){
			errors.push('Chapters_id required.');
		}
		
		if(errors.length){
			deferred.reject(errors);
			return deferred.promise;
		}
		
		var activeChapterRecruitment;
		
		//first see if the chapter currently has an active recruitment
		recruitmentModel.all({
			Chapters_id: Chapters_id,
			active: true
		}).then(function(activeChapterRecruitments){
			if(Utils.isEmpty(activeChapterRecruitments)){
				throw new Error('Chapter does not currently have an active recruitment.');
			}
			
			activeChapterRecruitment = activeChapterRecruitments[0];

			return userModel.isInDefaultChapter(Users_id);
		}).then(function(isInDefaultChapter){
			if(!isInDefaultChapter){
				throw new Error('User is not in the default chapter.');
			}
			
			//if the user is following the chapter, or if they have checked into one of their recruitment events, then make them a pnm, otherwise, remove them from being a pnm if they currently are one
			
			return q.all([
				methods.getFollowers({
					Chapters_id: Chapters_id,
					Users_id: Users_id
				}),
				eventModel.getCheckins({
					ChapterRecruitments_id: activeChapterRecruitment.ChapterRecruitments_id,
					Users_id: Users_id
				}),
				db.fetchOne([
					'select *',
					'from ChapterRecruitmentUsers',
					'where',
					'	ChapterRecruitmentUsers_joinChapterRecruitments_id = :ChapterRecruitments_id',
					'	and ChapterRecruitmentUsers_joinUsers_id = :Users_id'
				], {
					ChapterRecruitments_id: activeChapterRecruitment.ChapterRecruitments_id,
					Users_id: Users_id,
				})
			]);
		}).then(function(results){
			var followers = results[0];
			var checkins = results[1];
			var chapterRecruitmentUser = results[2];
			
			//could do it this way, but then if it updates, we can't get ChapterRecruitmentUsers_id for logging
// 			return db.sql([
// 				'insert into ChapterRecruitmentUsers(ChapterRecruitmentUsers_joinChapterRecruitments_id, ChapterRecruitmentUsers_joinUsers_id, ChapterRecruitmentUsers_role)',
// 				'values(:ChapterRecruitments_id, :Users_id, "pnm")',
// 				'on duplicate key update',
// 				'	ChapterRecruitmentUsers_role = "pnm"'
// 			], {
// 				ChapterRecruitments_id: activeChapterRecruitment.ChapterRecruitments_id,
// 				Users_id: Users_id,
// 				ChapterRecruitmentUsers_role: 'pnm'
// 			});
			
			if(!Utils.isEmpty(followers) || !Utils.isEmpty(checkins)){
				//** Add the user as a pnm **
				if(Utils.isEmpty(chapterRecruitmentUser)){
					return db.insert('ChapterRecruitmentUsers', {
						ChapterRecruitmentUsers_joinChapterRecruitments_id: activeChapterRecruitment.ChapterRecruitments_id,
						ChapterRecruitmentUsers_joinUsers_id: Users_id,
						ChapterRecruitmentUsers_role: 'pnm'
					});
				}
				else if(chapterRecruitmentUser.ChapterRecruitmentUsers_role != 'pnm'){
					return db.update('ChapterRecruitmentUsers', {
						ChapterRecruitmentUsers_role: 'pnm'
					}, chapterRecruitmentUser.ChapterRecruitmentUsers_id);
				}else{
					//they're already set, so ignore
				}
			}
			else if(chapterRecruitmentUser.ChapterRecruitmentUsers_role == 'pnm'){
				//** Remove the user from being a pnm **
				
				return db.update('ChapterRecruitmentUsers', {
					ChapterRecruitmentUsers_role: 'none'
				}, chapterRecruitmentUser.ChapterRecruitmentUsers_id);
			}else{
				//they're not a pnm so leave them alone
			}
		}).then(function(chapterRecruitmentUser){
			if(!Utils.isEmpty(chapterRecruitmentUser)){
				greekrush.logRow('ChapterRecruitmentUsers', chapterRecruitmentUser.ChapterRecruitmentUsers_id);
			}
			
			deferred.resolve();
		}).catch(function(error){
			deferred.reject(error);
		});
		
		return deferred.promise;
	},
	
	updateRecruitmentUsers: function(chapterrecruitmentusers_ids, ChapterRecruitmentUsers_role){
		var deferred = q.defer();
		var errors = [];
		var allowedRoles = ['none', 'pnm', 'pref', 'bid', 'accepted'];
		
		if(Utils.isEmpty(chapterrecruitmentusers_ids)){
			errors.push('chapterrecruitmentusers_ids required.');
		}
		if(allowedRoles.indexOf(ChapterRecruitmentUsers_role) === -1){
			errors.push('ChapterRecruitmentUsers_role must be one of: ' + allowedRoles.join(', '));
		}
		
		if(errors.length){
			deferred.reject(errors);
			return deferred.promise;
		}
		
		db.update('ChapterRecruitmentUsers', {
			ChapterRecruitmentUsers_role: ChapterRecruitmentUsers_role
		}, chapterrecruitmentusers_ids).then(function(){
			//it's possible that not all of the updates resulted actual changes to the data, but log everything anyways
			greekrush.logRow('ChapterRecruitmentUsers', chapterrecruitmentusers_ids);
			
			deferred.resolve();
		}).catch(function(){
			deferred.reject();
		})
		
		return deferred.promise;
	}
}

module.exports = methods;