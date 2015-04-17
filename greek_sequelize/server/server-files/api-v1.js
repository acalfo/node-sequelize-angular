var Ajax = require('./ajax');
var db = require('./db');
var Utils = require('./utils');

//Models
var adminModel = require('../models/admin');
var userModel = require('../models/user');
var chapterModel = require('../models/chapter');
var universityModel = require('../models/university');
var councilModel = require('../models/council');
var orgModel = require('../models/organization');
var recruitmentModel = require('../models/recruitment');
var eventModel = require('../models/event');
var locationModel = require('../models/location');


//The user must be logged in
function generalLoginRequired(req, res, next){
	if(!userModel.isLoggedIn(req.session)){
		var ajax = new Ajax();
		ajax.addAction('logout');
		ajax.addErrorInternal('User must be logged in.', true);

		res.json(ajax.obj);
	}else{
		next();
	}
}

function userTypeRequired(type){
	var types = typeof type == 'string' ? [type] : type;	//allows an array of types

	return function(req, res, next){
		var user = req.session.user;

		generalLoginRequired(req, res, function(){
			var ajax = new Ajax();

			if(types.indexOf(user.Users_type) === -1){
				ajax.addError('The user is not a ' + type + ' User.');
				res.json(ajax.obj);
			}
			else if(user.Users_type == 'chapter'){
				//Make sure they have verified their phone number
				if(user.Users_phoneVerified){
					next();
				}else{
					ajax.addAction('verifyPhone');
					ajax.addErrorInternal('User must verify their phone number.', true);
					res.json(ajax.obj);
				}
			}
			else{
				next();
			}
		});
	}
}

function init(app){
	app.use(function(req, res, next){
		console.log(req.method + ' ' + req.url);
		next();
	});

	/**** API ROUTES ****/
	app.get('/test', function (req, res) {
		//general testing
	});

	app.get('/', function (req, res) {
		res.send('GreekRush API');
	});

	app.get('/tos', function (req, res) {
		var ajax = new Ajax();

		db.fetchSinglet('select Settings_value from Settings where Settings_name = "tos"').then(function(tos){
			tos = tos.replace(/(?:\r\n|\r|\n)/g, '<br />');
			ajax.setData(tos);
		}, function(errors){
			ajax.addErrors(errors);
		}).finally(function(){
			res.json(ajax.obj);
		});
	});

	app.post('/user/login', function (req, res) {
		var ajax = new Ajax();

		if(req.session.loggingIn){
			//make sure loggingIn can't get stuck to true forever
			if(req.session.loggingIn < (new Date()).getTime() - 5000){
				req.session.loggingIn = false;
			}else{
				ajax.addError('Currently attempting login.');

				res.json(ajax.obj);
				return false;
			}
		}

		function doLogin(){
			userModel.loginUser(req.body).then(function(user){
				//Success

				delete req.session.loginAttempts;

				if(Utils.isEmpty(user)){
					ajax.addError('User cannot be found');
					ajax.addAction('logout');
				}else{
					req.session.user = user;
					ajax.setData(user);
				}
			}, function(errors){
				//Error
				ajax.addErrors(errors);
			}).finally(function(){
				req.session.loggingIn = false;
				res.json(ajax.obj);
			});
		}

		req.session.loginAttempts++;
		req.session.loggingIn = (new Date()).getTime();
		req.session.save();

		//if they keep trying, put in a delay to slow down crackers
		if(req.session.loginAttempts > 5){
			setTimeout(doLogin, 2000);
		}else{
			doLogin();
		}
	});

	app.post('/forgot_password', function (req, res) {
		var ajax = new Ajax();

		userModel.sendResetPassword(req.body).then(function(){
			res.json(ajax.obj);
		}, function(errors){
			ajax.addErrors(errors);
			res.json(ajax.obj);
		});
	});

	app.post('/reset_password', function (req, res) {
		var ajax = new Ajax();

		userModel.resetPassword(req.body).then(function(){
			res.json(ajax.obj);
		}, function(errors){
			ajax.addErrors(errors);
			res.json(ajax.obj);
		});
	});

	app.get('/user/logout', function (req, res) {
		var ajax = new Ajax();

		userModel.logOut(req.session);

		res.json(ajax.obj);
	});

	app.post('/user/register', function (req, res) {
		var ajax = new Ajax();

		userModel.create(req.body).then(function(user){
			//Success

			//log the user in (by setting their session)
			req.session.user = user;

			ajax.setData(user);

			res.json(ajax.obj);
		},function(errors){
			//Error

			ajax.addErrors(errors);

			res.json(ajax.obj);
		});
	});

	app.get('/isLoggedIn', function(req, res){
		var ajax = new Ajax();

		ajax.setData(userModel.isLoggedIn(req.session));

		res.json(ajax.obj);
	});

	//gets the logged in user
	app.get('/user', generalLoginRequired, function (req, res) {
		var ajax = new Ajax();

		// use session.user value
		// ajax.setData(req.session.user);
		// res.json(ajax.obj);

		//console.log('/user: req.session', req.session);

		// 		userModel.one({Users_id: req.session.user.Users_id}).then(function(user){
		// 			if(Utils.isEmpty(user)){
		// 				ajax.addError('User cannot be found');
		// 				ajax.addAction('logout');
		// 			}else{
		// 				//update session
		// 				req.session.user = user;

		// 				ajax.setData(user);
		// 			}
		// 		}, function(error){
		// 			ajax.addError(error);
		// 		}).finally(function(){
		// 			res.json(ajax.obj);
		// 		});

		userModel.get({Users_id: req.session.user.Users_id}, true).then(function(users){
			if(Utils.isEmpty(users)){
				ajax.addError('User cannot be found');
				ajax.addAction('logout');
			}else{
				var user = users[0];

				//update session
				req.session.user = user;

				ajax.setData(user);
			}
		}, function(error){
			ajax.addError(error);
		}).finally(function(){
			res.json(ajax.obj);
		});
	});

	app.get('/users', generalLoginRequired, function (req, res) {
		var ajax = new Ajax();
		
		var data = req.query;
		
		data.Universities_id = req.session.user.Universities_id;

		userModel.get(data).then(function(users){
			ajax.setData(users);
		}, function(error){
			ajax.addError(error);
		}).finally(function(){
			res.json(ajax.obj);
		});
	});

	/* deprecated
	//for updating the currently logged in user's chapter
	app.post('/update_user_chapter', generalLoginRequired, function(req, res){
		var ajax = new Ajax();

		var data = req.body;

		//make sure they cannot set ChapterUserRoles_name (since updateChapter() allows this)
		delete data.ChapterUserRoles_name;

		userModel.updateChapter(req.session.user.Users_id, data).then(function(){
			//do nothing yet
		}, function(errors){
			ajax.addErrors(errors);
		}).finally(function(){
			res.json(ajax.obj);
		});
	});
	*/

	//for updating the currently logged in user's university
	app.post('/update_user_university', generalLoginRequired, function(req, res){
		var ajax = new Ajax();
		var errors = [];

		var data = req.body;
		
		if(Utils.isEmpty(req.session.user, 'Users_gender')){
			errors.push('Users_gender is not set yet.');
		}
		
		if(errors.length){
			ajax.addErrors(errors);
			res.json(ajax.obj);
			return false;
		}

		if(!Utils.isEmpty(req.session.user.Universities_id)){
			//For now, we're not handling this
			if(req.session.user.Universities_id != data.Universities_id){
				ajax.addError('Already part of a different University.');
			}
			res.json(ajax.obj);
		}else{
			userModel.updateUniversity(req.session.user.Users_id, req.session.user.Users_gender, data.Universities_id).then(function(Universities_id){
				req.session.user.Universities_id = Universities_id;
				req.session.user.Users_type = 'chapter';
				ajax.setData(req.session.user);
			}, function(errors){
				ajax.addErrors(errors);
			}).finally(function(){
				res.json(ajax.obj);
			});
		}
	});

	//for updating the currently logged in user
	app.post('/user', generalLoginRequired, function(req, res){
		var ajax = new Ajax();

		userModel.update(req.session.user.Users_id, req.body).then(function(user){
			//update session
			for(var field in user){
				req.session.user[field] = user[field];
			}

			//send back updated user
			ajax.setData(req.session.user);
		}, function(error){
			ajax.addError(error);
		}).finally(function(){
			res.json(ajax.obj);
		});
	});

	app.post('/user/join_chapter', generalLoginRequired, function(req, res){
		var ajax = new Ajax();

		userModel.addChapterRequest(req.session.user.Users_id, req.body).then(function(request){
			res.json(ajax.obj);
		}, function(errors){
			ajax.addErrors(errors);
			res.json(ajax.obj);
		});
	});

	app.get('/universities', generalLoginRequired, function (req, res) {
		var ajax = new Ajax();

		universityModel.all(req.query).then(function(universities){
			ajax.setData(universities);

			res.json(ajax.obj);
		});
	});

	app.get('/university', generalLoginRequired, function (req, res) {
		var ajax = new Ajax();

		var data = req.query;
		console.log(data);
		universityModel.one(data).then(function(university){
			ajax.setData(university);
		}, function(errors){
			ajax.addErrors(errors);
		}).finally(function(){
			res.json(ajax.obj);
		});
	});

	app.get('/orgs', generalLoginRequired, function (req, res) {
		var ajax = new Ajax();

		orgModel.all(req.query).then(function(organizations){
			ajax.setData(organizations);

			res.json(ajax.obj);
		});
	});

	app.get('/org', generalLoginRequired, function (req, res) {
		var ajax = new Ajax();

		var data = req.query;
		console.log(data);
		orgModel.one(data).then(function(org){
			ajax.setData(org);
		}, function(errors){
			ajax.addErrors(errors);
		}).finally(function(){
			res.json(ajax.obj);
		});
	});

	app.get('/councils', generalLoginRequired, function (req, res) {
		var ajax = new Ajax();
		
		var data = req.query;
		
		if(Utils.isEmpty(req.session.user, 'Universities_id')){
			ajax.addError('user not attached to university').
			res.json(ajax.obj);
			return false;
		}
		
		data.Universities_id = req.session.user.Universities_id;

		councilModel.get(data).then(function(councils){
			ajax.setData(councils);

			res.json(ajax.obj);
		});
	});

	app.get('/council', generalLoginRequired, function (req, res) {
		var ajax = new Ajax();

		var data = req.query;

		if(Utils.isEmpty(data, 'Councils_id')){
			ajax.addError('Councils_id required.');
			res.json(ajax.obj);
			return false;
		}

		councilModel.get(data).then(function(councils){
			if(Utils.isEmpty(councils)){
				ajax.addError('ERROR: no councils found.');
			}else{
				ajax.setData(councils[0]);
			}
		}, function(errors){
			ajax.addErrors(errors);
		}).finally(function(){
			res.json(ajax.obj);
		});
	});

	app.get('/chapters', generalLoginRequired, function (req, res) {
		var ajax = new Ajax();

		chapterModel.all(req.query).then(function(chapters){
			chapters = chapters.map(function(chapter){
				//Orgs_img is deprecated but still used in an early version of the app (1.1.2)
				chapter.Orgs_img = chapter.Orgs_crest;
				
				return chapter;
			});
			
			ajax.setData(chapters);

			res.json(ajax.obj);
		});
	});

	app.get('/chapter', generalLoginRequired, function (req, res) {
		var ajax = new Ajax();

		chapterModel.one(req.query).then(function(chapter){
			//Chapters_details is deprecated but still used in an early version of the app (1.1.2)
			chapter.Chapters_details = chapter.Orgs_info;
			
			//Orgs_img is deprecated but still used in an early version of the app (1.1.2)
			chapter.Orgs_img = chapter.Orgs_crest;

			ajax.setData(chapter);

			res.json(ajax.obj);
		});
	});

	app.get('/reasons', generalLoginRequired, function (req, res) {
		var ajax = new Ajax();

		db.fetchAll('select * from Reasons order by Reasons_text').then(function(reasons){
			ajax.setData(reasons);

			res.json(ajax.obj);
		});
	});

	/*deprecated
	app.get('/university_active_recruitments', generalLoginRequired, function (req, res) {
		var ajax = new Ajax();

		var data = req.query;

		if(Utils.isEmpty(req.session.user, 'Universities_id')){
			ajax.addError('User is not attached to a university');
			res.json(ajax.obj);
			return false;
		}

		data.Universities_id = req.session.user.Universities_id;

		recruitmentModel.getActiveRecruitments(data).then(function(active_recruitments){
			ajax.setData(active_recruitments);
		}, function(errors){
			ajax.addErrors(errors);
		}).finally(function(){
			res.json(ajax.obj);
		});
	});
	*/

	app.post('/join_recruitment', userTypeRequired('chapter'), function(req, res){
		var ajax = new Ajax();

		recruitmentModel.addRecruitmentRequest(req.session.user.Users_id, req.body).then(function(request){

		}, function(errors){
			ajax.addErrors(errors);
		}).finally(function(){
			res.json(ajax.obj);
		});
	});

	app.post('/follow_chapter', generalLoginRequired, function(req, res){
		var ajax = new Ajax();
		
		var data = req.body;

		userModel.followChapter(req.session.user.Users_id, data.Chapters_id).then(function(){
			chapterModel.addOrRemovePnm(req.session.user.Users_id, data.Chapters_id);
		}).catch(function(errors){
			ajax.addErrors(errors);
		}).finally(function(){
			res.json(ajax.obj);
		});
	});

	app.post('/unfollow_chapter', generalLoginRequired, function(req, res){
		var ajax = new Ajax();
		
		var data = req.body;

		userModel.unfollowChapter(req.session.user.Users_id, data.Chapters_id).then(function(){
			chapterModel.addOrRemovePnm(req.session.user.Users_id, data.Chapters_id);
		}).catch(function(errors){
			ajax.addErrors(errors);
		}).finally(function(){
			res.json(ajax.obj);
		});
	});

	app.get('/chapter_followers', generalLoginRequired, function(req, res){
		var ajax = new Ajax();
		var errors = [];

		//restrict the returned requests to only this user's chapter's
		var data = req.query;

		if(Utils.isEmpty(data, 'Chapters_id')){
			errors.push('Chapters_id required.');
		}

		if(errors.length){
			ajax.addErrors(errors);
			res.json(ajax.obj);
			return false;
		}

		chapterModel.getFollowers(data).then(function(followers){
			ajax.setData(followers);
		}, function(errors){
			ajax.addErrors(errors);
		}).finally(function(){
			res.json(ajax.obj);
		});
	});

	app.get('/user_following', generalLoginRequired, function(req, res){
		var ajax = new Ajax();
		var errors = [];

		//restrict the returned requests to only this user's chapter's
		var data = req.query;

		if(Utils.isEmpty(data, 'Users_id')){
			errors.push('Users_id required.');
		}

		if(errors.length){
			ajax.addErrors(errors);
			res.json(ajax.obj);
			return false;
		}

		chapterModel.getFollowers(data).then(function(followers){
			ajax.setData(followers);
		}, function(errors){
			ajax.addErrors(errors);
		}).finally(function(){
			res.json(ajax.obj);
		});
	});

	app.post('/text_confirmation_code', generalLoginRequired, function(req, res){
		var ajax = new Ajax();

		userModel.textConfirmationCode(req.session.user.Users_id).then(function(){

		}).catch(function(errors){
			ajax.addErrors(errors);
		}).finally(function(){
			res.json(ajax.obj);
		});
	});
	app.post('/email_confirmation_code', generalLoginRequired, function(req, res){
		var ajax = new Ajax();

		userModel.emailConfirmationCode(req.session.user.Users_id).then(function(){

		}).catch(function(errors){
			ajax.addErrors(errors);
		}).finally(function(){
			res.json(ajax.obj);
		});
	});
	app.post('/confirm_confirmation_code', generalLoginRequired, function(req, res){
		var ajax = new Ajax();

		userModel.confirmConfirmationCode(req.session.user.Users_id, req.body.code).then(function(){
			//update session
			return userModel.get({
				Users_id: req.session.user.Users_id
			}, true);
		}).then(function(users){
			if(Utils.isEmpty(users)){
				ajax.addError('User cannot be found');
				ajax.addAction('logout');
			}else{
				var user = users[0];
				
				//update session
				req.session.user = user;
			}
			
			ajax.setData(true);
		}).catch(function(errors){
			ajax.addErrors(errors);
		}).finally(function(){
			res.json(ajax.obj);
		});
	});
	
	app.post('/location/create', userTypeRequired(['university', 'org', 'council', 'chapter']), function(req, res){
		var ajax = new Ajax();
		
		var data = req.body;
		
		locationModel.create(data).then(function(location){
			ajax.setData(location);
		}).catch(function(errors){
			ajax.addErrors(errors);
		}).finally(function(){
			res.json(ajax.obj);
		});
	});

	/** University User Stuff **/
	app.get('/university_user/recruitments', userTypeRequired('university'), function (req, res) {
		var ajax = new Ajax();

		var data = {
			Universities_id: req.session.user.Universities_id
		};

		recruitmentModel.all(data).then(function(recruitments){
			ajax.setData(recruitments);
		}, function(errors){
			ajax.addErrors(errors);
		}).finally(function(){
			res.json(ajax.obj);
		});
	});
	app.post('/university_user/set_user_type', userTypeRequired('university'), function (req, res) {
		var ajax = new Ajax();

		var data = req.body;

		userModel.canSetUserType(req.session.user, data).then(function(canSetUserType){
			//canSetUserType should never really be false, there will just be an error instead
			if(!canSetUserType){
				throw new Error('logged in user cannot set this user type.');
			}

			return userModel.setUserType(data);
		}).then(function(user){
			ajax.setData(user);
		}).catch(function(errors){
			ajax.addErrors(errors);
		}).finally(function(){
			res.json(ajax.obj);
		});
	});
	app.post('/university_user/remove_user_councils', userTypeRequired('university'), function (req, res) {
		var ajax = new Ajax();

		userModel.removeUserCouncil(req.body).then(function(){

		}).catch(function(errors){
			ajax.addErrors(errors);
		}).finally(function(){
			res.json(ajax.obj);
		});
	});

	app.post('/university_user/update_recruitment_users_statuses', userTypeRequired('university'), function (req, res) {
		var ajax = new Ajax();

		userModel.updateRecruitmentUsersStatuses(req.body.recruitmentusers_ids, req.body.RecruitmentUsers_status).then(function(user){
			//ajax.setData(user);
		}, function(errors){
			ajax.addErrors(errors);
		}).finally(function(){
			res.json(ajax.obj);
		});
	});

	/** University and Council User Stuff **/
	app.get('/recruitment', userTypeRequired(['university', 'council', 'chapter']), function (req, res) {
		var ajax = new Ajax();
		var errors = [];
		
		var data = req.query;
		
		if(Utils.isEmpty(data, 'Recruitments_id')){
			errors.push('Recruitments_id required.');
		}
		if(req.session.user.Users_type == 'council' && Utils.isEmpty(req, 'session', 'user', 'councils_ids')){
			errors.push('Council user has no councils.');
		}
		
		if(errors.length){
			ajax.addErrors(errors);
			res.json(ajax.obj);
			return false;
		}

		//make sure the user can only see their recruitments
// 		if(req.session.user.Users_type == 'university'){
// 			data.Universities_id = req.session.user.Universities_id;
// 		}
// 		else if(req.session.user.Users_type == 'council'){
// 			data.councils_ids = req.session.user.councils_ids;
// 		}
// 		else if(req.session.user.Users_type == 'chapter'){
// 			data.Chapters_id = req.session.user.Chapters_id;
// 		}
		data.Universities_id = req.session.user.Universities_id;

		recruitmentModel.all(data).then(function(recruitments){
			var recruitment = recruitments.length ? recruitments[0] : {};
			ajax.setData(recruitment);
		}).catch(function(errors){
			ajax.addErrors(errors);
		}).finally(function(){
			res.json(ajax.obj);
		});
	});
	app.get('/recruitments', userTypeRequired(['university', 'council', 'chapter']), function (req, res) {
		var ajax = new Ajax();
		var errors = [];
		
		var data = req.query;
		
		if(req.session.user.Users_type == 'council' && Utils.isEmpty(req, 'session', 'user', 'councils_ids')){
			errors.push('Council user has no councils.');
		}
		
		if(errors.length){
			ajax.addErrors(errors);
			res.json(ajax.obj);
			return false;
		}

		//make sure the user can only see their recruitments
		if(req.session.user.Users_type == 'university' || req.session.user.Users_type == 'chapter'){
			data.Universities_id = req.session.user.Universities_id;
		}
		else if(req.session.user.Users_type == 'council'){
			data.councils_ids = req.session.user.councils_ids;
		}
// 		else if(req.session.user.Users_type == 'chapter'){
// 			data.Chapters_id = req.session.user.Chapters_id;
// 		}
		data.Universities_id = req.session.user.Universities_id;

		recruitmentModel.all(data).then(function(recruitments){
			ajax.setData(recruitments);
		}).catch(function(errors){
			ajax.addErrors(errors);
		}).finally(function(){
			res.json(ajax.obj);
		});
	});
	
	app.get('/recruitment_users', userTypeRequired(['university', 'council']), function (req, res) {
		var ajax = new Ajax();

		var data = req.query;

		//make sure the user can only see their recruitments
		if(req.session.user.Users_type == 'university'){
			data.Universities_id = req.session.user.Universities_id;
		}
		else if(req.session.user.Users_type == 'council' && !Utils.isEmpty(req, 'session', 'user', 'councils_ids')){
			data.councils_ids = req.session.user.councils_ids;
		}

		recruitmentModel.users(data).then(function(recruitment_requests){
			ajax.setData(recruitment_requests);
		}, function(errors){
			ajax.addErrors(errors);
		}).finally(function(){
			res.json(ajax.obj);
		});
	});

	/** Council User Stuff **/
	app.get('/council_user/recruitments', userTypeRequired('council'), function (req, res) {
		var ajax = new Ajax();

		if(Utils.isEmpty(req, 'session', 'user', 'councils_ids')){
			ajax.addError('no councils attached to user');
			res.json(ajax.obj);
		}else{
			//restrict the returned recruitments to only this user's
			var data = {
				councils_ids: req.session.user.councils_ids
			}

			recruitmentModel.all(data).then(function(recruitments){
				ajax.setData(recruitments);
			}, function(errors){
				ajax.addErrors(errors);
			}).finally(function(){
				res.json(ajax.obj);
			});
		}
	});
	app.post('/recruitment/create', userTypeRequired('council'), function (req, res) {
		var ajax = new Ajax();
		var errors = [];

		var data = req.body;

		//make sure the logged in person is able to edit this recruitment
		if(Utils.isEmpty(req, 'session', 'user', 'councils_ids')){
			errors.push('no councils attached to user');
		}
		else if(Utils.isEmpty(data.Recruitments_joinCouncils_id)){
			errors.push('ERROR: Please select a Council.');
		}
		else if(req.session.user.councils_ids.indexOf(data.Recruitments_joinCouncils_id) === -1){
			errors.push('You can not add a recruitment to that council.');
		}
		
		if(errors.length){
			ajax.addErrors(errors);
			res.json(ajax.obj);
			return false;
		}
		
		recruitmentModel.create(data).then(function(recruitment){
			ajax.setData(recruitment);
		}, function(errors){
			ajax.addErrors(errors);
		}).finally(function(){
			res.json(ajax.obj);
		});
	});
	app.post('/recruitment/update', userTypeRequired('council'), function (req, res) {
		var ajax = new Ajax();
		var errors = [];

		var data = req.body;

		if(Utils.isEmpty(req, 'session', 'user', 'councils_ids')){
			errors.push('no councils attached to user');
		}
		if(Utils.isEmpty(data, 'Recruitments_id')){
			errors.push('Recruitments_id required');
		}

		if(errors.length){
			ajax.addErrors(errors);
			res.json(ajax.obj);
			return false;
		}

		//make sure the logged in person is able to add this recruitment to it's council
		db.fetchOne('select * from Recruitments where Recruitments_id = :Recruitments_id', {Recruitments_id: data.Recruitments_id}).then(function(recruitment){
			if(req.session.user.councils_ids.indexOf(recruitment.Recruitments_joinCouncils_id) === -1){
				throw new Error('ERROR: You can not edit this recruitment.');
			}

			//make sure they aren't changing the council
			delete data.Recruitments_joinCouncils_id;

			return recruitmentModel.update(data);
		}).then(function(recruitment){
			ajax.addData(recruitment);
		}).catch(function(errors){
			ajax.addErrors(errors);
		}).finally(function(){
			res.json(ajax.obj);
		});
	});
	app.post('/recruitment/assign_chapter', userTypeRequired(['council']), function (req, res) {
		var ajax = new Ajax();
		var errors = [];
		
		var data = req.body;
		
		if(Utils.isEmpty(req, 'session', 'user', 'councils_ids')){
			errors.push('Council user has no councils.');
		}
		if(Utils.isEmpty(data.Recruitments_id)){
			errors.push('Recruitments_id is missing');
		}
		if(Utils.isEmpty(data.Chapters_id)){
			errors.push('Chapters_id is missing');
		}
		
		if(errors.length){
			ajax.addErrors(errors);
			res.json(ajax.obj);
			return false;
		}
		
		//make sure they can attach this chapter...
		chapterModel.one({
			councils_ids: req.session.user.councils_ids,
			Chapters_id: data.Chapters_id
		}).then(function(chapter){
			if(Utils.isEmpty(chapter)){
				throw new Error('Chapter not a part of logged in user\'s councils.');
			}
			
			//... to this recruitment
			return recruitmentModel.all({
				councils_ids: req.session.user.councils_ids,
				Recruitments_id: data.Recruitments_id
			})
		}).then(function(recruitment){
			if(Utils.isEmpty(recruitment)){
				throw new Error('Recruitment not a part of logged in user\'s councils.');
			}
			
			chapterModel.createRecruitment(data);
		}).then(function(chapterRecruitment){
			ajax.setData(chapterRecruitment);
		}).catch(function(errors){
			ajax.addErrors(errors);
		}).finally(function(){
			res.json(ajax.obj);
		});
	});

	/** Chapter User Stuff **/
	app.get('/chapter_requests', userTypeRequired('chapter'), function(req, res){
		var ajax = new Ajax();

		if(req.session.user.ChapterUserRoles_name !== 'president'){
			ajax.addError('Only Chapter presidents can view Chapter Requests.');
			res.json(ajax.obj);
			return false;
		}

		//restrict the returned requests to only this user's chapter's
		var data = {
			ChapterRequests_joinChapters_id: req.session.user.Chapters_id
		}

		chapterModel.getRequests(data).then(function(requests){
			ajax.setData(requests);
		}, function(errors){
			ajax.addErrors(errors);
		}).finally(function(){
			res.json(ajax.obj);
		});
	});
	app.post('/update_chapter_requests', userTypeRequired(['chapter']), function (req, res) {
		var ajax = new Ajax();
		var errors = [];

		var data = req.body;

		//make sure they're a president
		if(req.session.user.ChapterUserRoles_name !== 'president'){
			errors.push('Only Chapter presidents can update Chapter Requests.');
		}
		if(Utils.isEmpty(data.chapterrequests_ids)){
			errors.push('chapterrequests_ids is missing');
		}

		if(errors.length){
			ajax.addErrors(errors);
			res.json(ajax.obj);
			return false;
		}

		//make sure they can only update their chapter's requests
		db.fetchSinglets([
			'select ChapterRequests_id',
			'from ChapterRequests',
			'where',
			'	ChapterRequests_id in(' + db.escapeIn(data.chapterrequests_ids) + ')',
			'	and ChapterRequests_joinChapters_id = :Chapters_id'
		], {
			Chapters_id: req.session.user.Chapters_id
		}).then(function(chapterrequests_ids){
			return chapterModel.updateRequestsStatuses(chapterrequests_ids, data.ChapterRequests_status, req.session.user.Chapters_id);
		}).then(function(){

		}).catch(function(errors){
			ajax.addErrors(errors);
		}).finally(function(){
			res.json(ajax.obj);
		});
	});
	app.post('/assign_recruitment_chairs', userTypeRequired(['chapter']), function (req, res) {
		var ajax = new Ajax();
		var errors = [];

		var data = req.body;

		//make sure they're a president
		if(req.session.user.ChapterUserRoles_name !== 'president'){
			errors.push('Only Chapter presidents can assign recruitment chairs.');
		}
		if(Utils.isEmpty(data, 'ChapterRecruitments_id')){
			errors.push('ChapterRecruitments_id required.');
		}
		if(Utils.isEmpty(data, 'chapterusers_ids')){
			errors.push('chapterusers_ids required.');
		}

		if(errors.length){
			ajax.addErrors(errors);
			res.json(ajax.obj);
			return false;
		}

		//make sure this is their recruitment
		db.fetchOne([
			'select *',
			'from ChapterRecruitments',
			'where',
			'	ChapterRecruitments_id = :ChapterRecruitments_id',
			'	and ChapterRecruitments_joinChapters_id = :Chapters_id'
		], {
			ChapterRecruitments_id: data.ChapterRecruitments_id,
			Chapters_id: req.session.user.Chapters_id
		}).then(function(recruitment){
			if(Utils.isEmpty(recruitment)){
				throw new Error('logged in user cannot manage this recruitment');
			}

			//make sure that all of the passed in users belong to this president's chapter
			return db.fetchSinglets([
				'select ChapterUsers_id',
				'from ChapterUsers',
				'where',
				'	ChapterUsers_joinChapters_id = :Chapters_id',
				'	and ChapterUsers_id in (' + db.escapeIn(data.chapterusers_ids) + ')'
			], {
				Chapters_id: req.session.user.Chapters_id
			});
		}).then(function(chapteruser_ids){
			if(Utils.isEmpty(chapteruser_ids) || chapteruser_ids.length != data.chapterusers_ids.length){
				throw new Error('not all supplied users belong to the logged in user\'s chapter');
			}
			
			data.ChapterRecruitmentUsers_role = 'chair';

			return chapterModel.addChapterRecruitmentUsers(data);
		}).then(function(){

		}).catch(function(errors){
			ajax.addErrors(errors);
		}).finally(function(){
			res.json(ajax.obj);
		});
	});
	app.post('/unassign_recruitment_chairs', userTypeRequired(['chapter']), function (req, res) {
		var ajax = new Ajax();
		var errors = [];

		var data = req.body;

		//make sure they're a president
		if(req.session.user.ChapterUserRoles_name !== 'president'){
			errors.push('Only Chapter presidents can unassign recruitment chairs.');
		}
		if(Utils.isEmpty(data, 'ChapterRecruitments_id')){
			errors.push('ChapterRecruitments_id required.');
		}
		if(Utils.isEmpty(data, 'chapterusers_ids')){
			errors.push('chapterusers_ids required.');
		}

		if(errors.length){
			ajax.addErrors(errors);
			res.json(ajax.obj);
			return false;
		}

		//make sure this is their recruitment
		db.fetchOne([
			'select *',
			'from ChapterRecruitments',
			'where',
			'	ChapterRecruitments_id = :ChapterRecruitments_id',
			'	and ChapterRecruitments_joinChapters_id = :Chapters_id'
		], {
			ChapterRecruitments_id: data.ChapterRecruitments_id,
			Chapters_id: req.session.user.Chapters_id
		}).then(function(recruitment){
			if(Utils.isEmpty(recruitment)){
				throw new Error('logged in user cannot manage this recruitment');
			}

			//make sure that all of the passed in users belong to this president's chapter
			return db.fetchSinglets([
				'select ChapterUsers_id',
				'from ChapterUsers',
				'where',
				'	ChapterUsers_joinChapters_id = :Chapters_id',
				'	and ChapterUsers_id in (' + db.escapeIn(data.chapterusers_ids) + ')'
			], {
				Chapters_id: req.session.user.Chapters_id
			});
		}).then(function(chapteruser_ids){
			if(Utils.isEmpty(chapteruser_ids) || chapteruser_ids.length != data.chapterusers_ids.length){
				throw new Error('not all supplied users belong to the logged in user\'s chapter');
			}

			return chapterModel.removeChapterRecruitmentUsers(data);
		}).then(function(){

		}).catch(function(errors){
			ajax.addErrors(errors);
		}).finally(function(){
			res.json(ajax.obj);
		});
	});
	app.get('/get_recruitment_chairs', userTypeRequired(['chapter']), function (req, res) {
		var ajax = new Ajax();
		var errors = [];

		var data = req.query;

		//make sure they're a president
		if(req.session.user.ChapterUserRoles_name !== 'president'){
			errors.push('Only Chapter presidents can get recruitment chairs.');
		}
		if(Utils.isEmpty(data, 'ChapterRecruitments_id')){
			errors.push('ChapterRecruitments_id required.');
		}

		if(errors.length){
			ajax.addErrors(errors);
			res.json(ajax.obj);
			return false;
		}

		//make sure this is their recruitment
		db.fetchOne([
			'select *',
			'from ChapterRecruitments',
			'where',
			'	ChapterRecruitments_id = :ChapterRecruitments_id',
			'	and ChapterRecruitments_joinChapters_id = :Chapters_id'
		], {
			ChapterRecruitments_id: data.ChapterRecruitments_id,
			Chapters_id: req.session.user.Chapters_id
		}).then(function(recruitment){
			data.ChapterRecruitmentUsers_role = 'chair';
			
			return chapterModel.getChapterRecruitmentUsers(data);
		}).then(function(users){
			ajax.setData(users);
		}).catch(function(errors){
			ajax.addErrors(errors);
		}).finally(function(){
			res.json(ajax.obj);
		});
	});
	app.post('/update_recruitment_users', userTypeRequired(['chapter']), function (req, res) {
		var ajax = new Ajax();
		var errors = [];

		var data = req.body;

		//make sure they're a president
		if(req.session.user.ChapterUserRoles_name !== 'president'){
			errors.push('Only Chapter presidents can update recruitment users.');
		}
		if(Utils.isEmpty(data, 'chapterrecruitmentusers_ids')){
			errors.push('chapterrecruitmentusers_ids required.');
		}

		if(errors.length){
			ajax.addErrors(errors);
			res.json(ajax.obj);
			return false;
		}

		//make sure all chapter recruitment users are part of this chapter's active recruitment
		db.fetchOne([
			'select ChapterRecruitmentUsers_id',
			'from ChapterRecruitmentUsers',
			'join ChapterRecruitments on ChapterRecruitments_id = ChapterRecruitmentUsers_joinChapterRecruitments_id',
			'join Recruitments on Recruitments_id = ChapterRecruitments_joinRecruitments_id',
			'where',
			'	ChapterRecruitmentUsers_id in(' + db.escapeIn(data.chapterrecruitmentusers_ids) + ')',
			'	and ChapterRecruitments_joinChapters_id = :Chapters_id',
			'	and ' + recruitmentModel.isActiveWhereClause
		], {
			Chapters_id: req.session.user.Chapters_id
		}).then(function(chapterrecruitmentusers_ids){
			if(Utils.isEmpty(chapterrecruitmentusers_ids) || chapterrecruitmentusers_ids.length != data.chapterrecruitmentusers_ids.length){
				throw new Error('not all supplied chapter recruitment users belong to the logged in user\'s chapter');
			}

			return chapterModel.updateRecruitmentUsers(data);
		}).then(function(){

		}).catch(function(errors){
			ajax.addErrors(errors);
		}).finally(function(){
			res.json(ajax.obj);
		});
	});

	/** Events **/
	app.post('/event/create', userTypeRequired(['university', 'org', 'council', 'chapter']), function (req, res) {
		var ajax = new Ajax();
		var errors = [];

		var data = req.body;

		if(Utils.isEmpty(data, 'Events_type')){
			errors.push('Events_type required.');
		}
		else if(data.Events_type != req.session.user.Users_type){
			errors.push('Logged in user can only create ' + req.session.user.Users_type + ' events.');
		}

		if(errors.length){
			ajax.addErrors(errors);
			res.json(ajax.obj);
			return false;
		}

		eventModel.create(req.session.user.Users_id, data).then(function(event){
			ajax.setData(event);
		}, function(errors){
			ajax.addErrors(errors);
		}).finally(function(){
			res.json(ajax.obj);
		});
	});
	app.get('/event', generalLoginRequired, function(req, res){
		var ajax = new Ajax();

		var data = req.query;

		if(Utils.isEmpty(data, 'Events_id')){
			ajax.addErrors('No Events_id defined');
			res.json(ajax.obj);
			return false;
		}

		eventModel.get(data).then(function(events){
			if(!Utils.isEmpty(events)){
				ajax.setData(events[0]);
			}
		}, function(errors){
			ajax.addErrors(errors);
		}).finally(function(){
			res.json(ajax.obj);
		});
	});
	app.get('/events', generalLoginRequired, function(req, res){
		var ajax = new Ajax();

		var data = req.query;

		eventModel.get(data).then(function(events){
			ajax.setData(events);
		}, function(errors){
			ajax.addErrors(errors);
		}).finally(function(){
			res.json(ajax.obj);
		});
	});
	app.post('/event/update', userTypeRequired(['university', 'org', 'council', 'chapter']), function (req, res) {
		var ajax = new Ajax();

		var data = req.body;

		if(Utils.isEmpty(data, 'Events_id')){
			ajax.addError('Events_id required');
			res.json(ajax.obj);
			return false;
		}

		eventModel.canUserUpdateEvent(req.session.user.Users_id, data.Events_id).then(function(canUserUpdateEvent){
			if(!canUserUpdateEvent){
				ajax.addError('ERROR: Sorry you can not edit this event.');
				res.json(ajax.obj);
			}else{
				eventModel.update(data).then(function(event){
					ajax.setData(event);
				}).catch(function(errors){
					ajax.addErrors(errors);
				}).finally(function(){
					res.json(ajax.obj);
				});
			}
		});
	});
	app.post('/checkin',  generalLoginRequired, function(req, res){
		var ajax = new Ajax();

		var data = req.query;

		eventModel.checkin(req.session.user.Users_id, data).then(function(checkin){
			//if the event is attached to a chapter recruitment, then add the user as a chapter recruitment user
			eventModel.get({
				Events_id: checkin.EventCheckins_joinEvents_id
			}).then(function(event){
				if(!Utils.isEmpty(event, 'ChapterRecruitments_joinChapters_id')){
					chapterModel.addOrRemovePnm(req.session.user.Users_id, event.ChapterRecruitments_joinChapters_id);
				}
			});
		}).catch(function(errors){
			ajax.addErrors(errors);
		}).finally(function(){
			res.json(ajax.obj);
		});
	});

	/** Recruitments **/
	app.post('/recruitment_list/create', userTypeRequired(['chapter']), function (req, res) {
		var ajax = new Ajax();

		var data = req.body;

		if(!req.session.user.active){
			ajax.addError('Sorry, only active chapter members can add recruitment lists.');
			res.json(ajax.obj);
			return false;
		}

		recruitmentModel.createList(data).then(function(recruitment_list){
			ajax.setData(recruitment_list);
		}, function(errors){
			ajax.addErrors(errors);
		}).finally(function(){
			res.json(ajax.obj);
		});
	});
	app.get('/recruitment_list', userTypeRequired(['chapter']), function(req, res){
		var ajax = new Ajax();
		var errors = [];

		var data = req.query;

		if(!req.session.user.active){
			errors.push('Sorry, only active chapter members can view recruitment lists.');
		}
		if(data.Chapters_id != req.session.user.Chapters_i){
			errors.push('ERROR: You can only view your chapter\' recruitment lists.');
		}

		if(errors.length){
			ajax.addErrors(errors);
			res.json(ajax.obj);
			return false;
		}

		recruitmentModel.oneList(data).then(function(recruitmentList){
			ajax.setData(recruitmentList);
		}).catch(function(errors){
			ajax.addErrors(errors);
		}).finally(function(){
			res.json(ajax.obj);
		});
	});
	app.get('/recruitment_lists', userTypeRequired(['chapter']), function(req, res){
		var ajax = new Ajax();
		var errors = [];

		var data = req.query;

		if(!req.session.user.active){
			errors.push('Sorry, only active chapter members can view recruitment lists.');
		}
		if(data.Chapters_id != req.session.user.Chapters_i){
			errors.push('ERROR: You can only view your chapter\' recruitment lists.');
		}

		if(errors.length){
			ajax.addErrors(errors);
			res.json(ajax.obj);
			return false;
		}

		recruitmentModel.allLists(data).then(function(recruitmentLists){
			ajax.setData(recruitmentLists);
		}, function(errors){
			ajax.addErrors(errors);
		}).finally(function(){
			res.json(ajax.obj);
		});
	});
	app.post('/recruitment_list/update', userTypeRequired(['chapter']), function (req, res) {
		var ajax = new Ajax();
		var errors = [];

		var data = req.body;

		if(!req.session.user.active){
			errors.push('Sorry, only active chapter members can update recruitment lists.');
		}

		if(errors.length){
			ajax.addErrors(errors);
			res.json(ajax.obj);
			return false;
		}

		recruitmentModel.updateList(data).then(function(recruitmentList){
			ajax.setData(recruitmentList);
		}).catch(function(errors){
			ajax.addErrors(errors);
		}).finally(function(){
			res.json(ajax.obj);
		});
	});

	/** SuperAdmin stuff **/

	//The user must be a superadmin
	function superAdminRequired(req, res, next){
		if(!adminModel.isLoggedIn(req.session)){
			var ajax = new Ajax();

			ajax.addError('Admin is not logged in.');

			res.json(ajax.obj);
		}else{
			next();
		}
	}

	app.post('/admin/login', function (req, res) {
		var ajax = new Ajax();

		adminModel.login(req.body).then(function(admin){
			//Success

			req.session.admin = admin;

			ajax.setData(admin);

			res.json(ajax.obj);
		}, function(errors){
			//Error

			ajax.addErrors(errors);

			res.json(ajax.obj);
		});
	});
	app.post('/organization/create', superAdminRequired, function (req, res) {
		var ajax = new Ajax();

		orgModel.create(req.body).then(function(organization){
			ajax.setData(organization);
			res.json(ajax.obj);
		}, function(errors){
			ajax.addErrors(errors);
			res.json(ajax.obj);
		});
	});
	app.post('/university/create', superAdminRequired, function (req, res) {
		var ajax = new Ajax();

		universityModel.create(req.body).then(function(university){
			ajax.setData(university);
			res.json(ajax.obj);
		}, function(errors){
			ajax.addErrors(errors);
			res.json(ajax.obj);
		});
	});
	app.post('/university/update', superAdminRequired, function (req, res) {
		var ajax = new Ajax();

		if(typeof req.body.Universities_id === 'undefined'){
			ajax.addError('No Universities_id was set');
			res.json(ajax.obj);
			return;
		}

		var Universities_id = req.body.Universities_id;
		delete req.body.Universities_id;

		universityModel.update(Universities_id, req.body).then(function(){
			res.json(ajax.obj);
		}, function(errors){
			ajax.addErrors(errors);
			res.json(ajax.obj);
		});
	});

	//TODO: Create a Council

	app.post('/chapter/create', superAdminRequired, function (req, res) {
		var ajax = new Ajax();

		chapterModel.create(req.body).then(function(chapter){
			ajax.setData(chapter);
			res.json(ajax.obj);
		}, function(errors){
			ajax.addErrors(errors);
			res.json(ajax.obj);
		});
	});
	app.post('/chapter/delete', superAdminRequired, function (req, res) {
		var ajax = new Ajax();

		if(typeof req.body.Chapters_id === 'undefined'){
			ajax.addError('No Chapters_id was set');
			res.json(ajax.obj);
			return;
		}

		chapterModel.del(req.body.Chapters_id).then(function(){
			res.json(ajax.obj);
		}, function(errors){
			ajax.addErrors(errors);
			res.json(ajax.obj);
		});
	});
}

module.exports = {
	init: init
};
