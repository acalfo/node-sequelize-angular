var db = require('../server-files/db');
var q = require('q');
var Utils = require('../server-files/utils');
var moment = require('moment');

//DB fields that are publicly visible
var visibleFields = [
	'Recruitments_id',
	'Recruitments_start',
	'Recruitments_end',
	'Recruitments_startSignUp',
	'Recruitments_endSignUp',
	'Recruitments_requirements',
	'Councils_name',
	'Councils_gender',
	'ChapterRecruitments_id',
	'ChapterRecruitments_profile'
];

var methods = {
	
	isActiveWhereClause: 'DATE(Recruitments_end) >= CURDATE()',
	
	getVisibleFields: function(){
		return visibleFields;	
	},

	all: function(options){
		var deferred = q.defer();
		
		var wheres = [];
		var params = {};
		var joins = [];
		var tables = ['Recruitments', 'Councils', 'Universities'];
		
		joins.push('join Councils on Councils_id = Recruitments_joinCouncils_id');
		joins.push('join Universities on Universities_id = Councils_joinUniversities_id');
		
		if(!Utils.isEmpty(options, 'Chapters_id')){
			joins.push('join ChapterRecruitments on ChapterRecruitments_joinRecruitments_id = Recruitments_id');
			tables.push('ChapterRecruitments');
			joins.push('join Chapters on Chapters_id = ChapterRecruitments_joinChapters_id');
			tables.push('Chapters');
		}
		else if(!Utils.isEmpty(options, 'attachChapterRecruitments')){
			joins.push('left join ChapterRecruitments on ChapterRecruitments_joinRecruitments_id = Recruitments_id');
			tables.push('ChapterRecruitments');
			joins.push('left join Chapters on Chapters_id = ChapterRecruitments_joinChapters_id');
			tables.push('Chapters');
		}
		
		db.buildWheresParams(tables, options, wheres, params);
		
		if(!Utils.isEmpty(options, 'councils_ids')){
			wheres.push('Councils_id in(' + db.escapeIn(options.councils_ids) + ')');
		}
		if(!Utils.isEmpty(options, 'active')){
			wheres.push(this.isActiveWhereClause);
		}
		
		db.fetchAll([
			'select *',
			'from Recruitments',
			joins.join('\n'),
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
	
	users: function(options){
		var deferred = q.defer();
		var errors = [];
		
		if(Utils.isEmpty(options, 'Recruitments_id')){
			deferred.reject('Recruitments_id is missing');
			return deferred.promise;
		}
		
		var wheres = [];
		var params = {};
		
		db.buildWheresParams(['Recruitments', 'RecruitmentUsers', 'Councils', 'Universities'], options, wheres, params);
		
		db.fetchAll([
			'select *',
			'from RecruitmentUsers',
			'join Users on Users_id = RecruitmentUsers_joinUsers_id',
			'join Recruitments on Recruitments_id = RecruitmentUsers_joinRecruitments_id',
			'join Councils on Councils_id = Recruitments_joinCouncils_id',
			'join Universities on Universities_id = Councils_joinUniversities_id',
			db.wheres(wheres)
		], params).then(function(recruitment_users){
			var recruitmentUsersVisibleFields = require('./user').getVisibleFields().concat([
				'RecruitmentUsers_id',
				'RecruitmentUsers_status',
				'RecruitmentUsers_created'
			]);
			
			recruitment_users = recruitment_users.map(function(recruitment_user){
				return db.filterObject(recruitment_user, recruitmentUsersVisibleFields);
			});
			
			deferred.resolve(recruitment_users);
		});
		
		return deferred.promise;
	},
	
	create: function(new_recruitment){
		var deferred = q.defer()
			errors = [];
		
		if(Utils.isEmpty(new_recruitment, 'Recruitments_start')){
			errors.push('ERROR: Please enter a start date.');
		}
		if(Utils.isEmpty(new_recruitment, 'Recruitments_end')){
			errors.push('ERROR: Please enter a end date.');
		}
		if(Utils.isEmpty(new_recruitment, 'Recruitments_startSignUp')){
			errors.push('ERROR: Please enter a signup start date.');
		}
		if(Utils.isEmpty(new_recruitment, 'Recruitments_endSignUp')){
			errors.push('ERROR: Please enter a signup end date.');
		}
		if(Utils.isEmpty(new_recruitment, 'Recruitments_joinCouncils_id')){
			errors.push('ERROR: Please select a council.');
		}
		
		//dates validation
		if(!errors.length){
			var start = Utils.strtotime(new_recruitment.Recruitments_start);
			var end = Utils.strtotime(new_recruitment.Recruitments_end);
			var startSignUp = Utils.strtotime(new_recruitment.Recruitments_startSignUp);
			var endSignUp = Utils.strtotime(new_recruitment.Recruitments_endSignUp);
			
			if(end < start){
				errors.push('ERROR: End date must be after start date.');
			}
			if(endSignUp < startSignUp){
				errors.push('ERROR: Signup end date must be after signup start date.');
			}
			if(start < startSignUp){
				errors.push('ERROR: Signup start date must be before start date.');
			}
			if(end < endSignUp){
				errors.push('ERROR: Signup end date must be before end date.');
			}
			if(start < Utils.strtotime('now')){
				errors.push('ERROR: Start date must be in the future.');
			}
		}
		
		if(errors.length){
			deferred.reject(errors);
		}else{
			db.fetchSinglet([
				'select Recruitments_id',
				'from Recruitments',
				'where',
				'	Recruitments_joinCouncils_id = :Councils_id',
				
				//if there's an overlapping recruitment
				'	and (',
				'		Recruitments_start between :Recruitments_startSignUp and :Recruitments_end',
				'		or Recruitments_end between :Recruitments_startSignUp and :Recruitments_end',
				'	)'
				
				//if there's one within 60 days TODO
			], {
				Councils_id: new_recruitment.Recruitments_joinCouncils_id,
				Recruitments_startSignUp: new_recruitment.Recruitments_startSignUp,
				Recruitments_end: new_recruitment.Recruitments_end
			}).then(function(recruitments_id){
				if(!Utils.isEmpty(recruitments_id)){
					throw new Error('ERROR: Sorry, there is already another recruitment during these dates.');
				}
				
				return db.insert('Recruitments', new_recruitment);
			}).then(function(_new_recruitment){
				deferred.resolve(_new_recruitment);
			}).catch(function(error){
				deferred.reject(error);
			})
		}
		
		return deferred.promise;
	},

	addRecruitmentRequest: function(Users_id, requestData){
		var deferred = q.defer();
		var errors = [];


		if(Utils.isEmpty(Users_id)){
			errors.push('No Users_id given.');
		}
		if(Utils.isEmpty(requestData, 'Recruitments_id')){
			errors.push('No Recruitments_id given.');
		}

		if(errors.length){
			deferred.reject(errors);
		}else{
			//see if they've already attempted to join this recruitment
			db.fetchSinglet([
				'select RecruitmentUsers_status',
				'from RecruitmentUsers',
				'where',
				'	RecruitmentUsers_joinUsers_id = :Users_id',
				'	and RecruitmentUsers_joinRecruitments_id = :Recruitments_id'
			], {
				Users_id: Users_id,
				Recruitments_id: requestData.Recruitments_id
			}).then(function(status){
				if(!Utils.isEmpty(status)){
					throw new Error('ERROR: Recruitment request already exists. Status = ' + status);
				}
				
				//make sure they're still able to register for this recruitment
				return db.fetchOne([
					'select *, DATE(Recruitments_startSignUp) as startSignUpDate, DATE(Recruitments_endSignUp) as endSignUpDate',
					'from Recruitments',
					'where',
					'	Recruitments_id = :Recruitments_id'
				], {
					Recruitments_id: requestData.Recruitments_id
				});
			}).then(function(recruitment){
				if(moment() < moment(recruitment.startSignUpDate) || moment() > moment(recruitment.endSignUpDate)){
					throw new Error('ERROR: You can only join this recruitment between ' + recruitment.startSignUpDate + ' and ' + recruitment.endSignUpDat);
				}

				return db.insert('RecruitmentUsers', {
					RecruitmentUsers_joinUsers_id: Users_id,
					RecruitmentUsers_joinRecruitments_id: requestData.Recruitments_id,
					RecruitmentUsers_status: 'pending',
				});
			}).then(function(recruitmentuser){
				deferred.resolve(recruitmentuser);
			}).catch(function(error){
				deferred.reject(error);
			});
		}

		return deferred.promise;
	},
	
	createList: function(new_recruitment_list){
		var deferred = q.defer()
			errors = [];
		
		if(Utils.isEmpty(new_recruitment_list, 'ChapterRecruitmentLists_joinChapterRecruitments_id')){
			errors.push('ERROR: Please select a Chapter Recruitment.');
		}
		if(Utils.isEmpty(new_recruitment_list, 'ChapterRecruitmentLists_name')){
			errors.push('ERROR: Please enter a name.');
		}
		
		if(errors.length){
			deferred.reject(errors);
		}else{
			db.insert('ChapterRecruitmentLists', new_recruitment_list).then(function(recruitment_list){
				deferred.resolve(recruitment_list);
			});
		}
		
		return deferred.promise;
	},
	
	allLists: function(options){
		var deferred = q.defer();
		var errors = [];
		
		var wheres = [];
		var params = {};
		
		db.buildWheresParams(['ChapterRecruitmentLists', 'ChapterRecruitments', 'Chapters'], options, wheres, params);
		
		db.fetchAll([
			'select *, COUNT(ChapterRecruitmentListUsers_id) as numUsers',
			'from ChapterRecruitmentLists',
			'join ChapterRecruitments on ChapterRecruitments_id = ChapterRecruitmentLists_joinChapterRecruitments_id',
			'join Chapters on Chapters_id = ChapterRecruitments_joinChapters_id',
			'join ChapterRecruitmentListUsers on ChapterRecruitmentListUsers_joinChapterRecruitmentLists_id = ChapterRecruitmentLists_id',
			db.wheres(wheres),
			'group by ChapterRecruitmentLists_id'
		], params).then(function(recruitmentLists){
			recruitmentLists = recruitmentLists.map(function(recruitmentList){
				return db.filterObject(recruitmentList, [
					'ChapterRecruitmentLists_name',
					'numUsers'
				]);
			});
			deferred.resolve(recruitmentLists);
		});
		
		return deferred.promise;
	},
	
	oneList: function(options){
		var deferred = q.defer();
		var errors = [];
		
		if(Utils.isEmpty(options, 'ChapterRecruitmentLists_id')){
			errors.push('ChapterRecruitmentLists_id is required.');
		}
		
		if(errors.length){
			deferred.reject(errors);
			return deferred.promise;
		}
		
		var wheres = [];
		var params = {};
		
		db.buildWheresParams(['ChapterRecruitmentLists'], options, wheres, params);
		
		var recruitmentList;
		db.fetchOne([
			'select *, COUNT(ChapterRecruitmentListUsers_id) as numUsers',
			'from ChapterRecruitmentLists',
			'join ChapterRecruitmentListUsers on ChapterRecruitmentListUsers_joinChapterRecruitmentLists_id = ChapterRecruitmentLists_id',
			db.wheres(wheres),
			'group by ChapterRecruitmentLists_id'
		], params).then(function(_recruitmentList){
			if(Utils.isEmpty(_recruitmentList)){
				deferred.resolve({});
				return false;
			}
			
			var wheres = [];
			var params = {};
			
			recruitmentList = _recruitmentList;
			
			recruitmentList = db.filterObject(recruitmentList, [
				'ChapterRecruitmentLists_name',
				'numUsers'
			]);
			
			wheres.push('ChapterRecruitmentListUsers_joinChapterRecruitmentLists_id = :ChapterRecruitmentLists_id');
			params.ChapterRecruitmentLists_id = recruitmentList.ChapterRecruitmentLists_id
			
			db.fetchAll([
				'select *',
				'from ChapterRecruitmentListUsers',
				'join Users on Users_id = ChapterRecruitmentListUsers_joinUsers_id',
				db.wheres(wheres)
			], params).then(function(users){
				recruitmentList.users = users;
				deferred.resolve(recruitmentList);
			}).catch(function(error){
				deferred.reject(error);
			});
		}).catch(function(error){
			deferred.reject(error);
		});
		
		return deferred.promise;
	},
	
	updateList: function(recruitmentList){
		var deferred = q.defer()
			errors = [];
		
		if(Utils.isEmpty(recruitmentList, 'ChapterRecruitmentLists_id')){
			errors.push('ChapterRecruitmentLists_id is required.');
		}
		if(Utils.isBlank(recruitmentList.ChapterRecruitmentLists_name)){
			errors.push('ERROR: Please enter a name.');
		}
		if(!Utils.isEmpty(recruitmentList, 'ChapterRecruitmentLists_joinChapterRecruitments_id')){
			errors.push('Cannot change ChapterRecruitmentLists_joinChapterRecruitments_id.');
		}
		
		if(errors.length){
			deferred.reject(errors);
		}else{
			db.update('ChapterRecruitmentLists', recruitmentList, recruitmentList.ChapterRecruitmentLists_id).then(function(recruitmentList){
				deferred.resolve(recruitmentList);
			});
		}
		
		return deferred.promise;
	},
	
	//adds a row into ChapterRecruitmentUsers with role = 'pnm' if it doesn't already exist
	/*addUserToActiveChapterRecruitment: function(Users_id, Chapters_id, ignoreErrors){
		var deferred = q.defer()
			errors = [];
		
		if(Utils.isEmpty(Users_id)){
			errors.push('Users_id required');
		}
		if(Utils.isEmpty(Chapters_id)){
			errors.push('Chapters_id required');
		}
		
		if(errors.length){
			deferred.reject(errors);
			return deferred.promise;
		}
		
		//see if the chapter has an active recruitment
		this.all({
			Chapters_id: Chapters_id,
			active: true
		}).then(function(activeRecruitments){
			if(Utils.isEmpty(activeRecruitments)){
				throw new Error('Chapter currently has no active recruitments');
			}
			
			var activeRecruitment = activeRecruitments[0];
			
			return db.insertIgnore('ChapterRecruitmentUsers', {
				ChapterRecruitmentUsers_joinChapterRecruitments_id: activeRecruitment.ChapterRecruitments_id,
				ChapterRecruitmentUsers_joinUsers_id: Users_id,
				ChapterRecruitmentUsers_role: 'pnm'
			});
		}).then(function(chapterRecruitmentUser){
			deferred.resolve(chapterRecruitmentUser);
		}).catch(function(error){
			if(ignoreErrors){
				deferred.resolve();
			}else{
				deferred.reject(error);
			}
		});
		
		return deferred.promise;
	}*/
}

module.exports = methods;