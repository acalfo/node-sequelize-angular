var db = require('../server-files/db');
var q = require('q');			//https://github.com/kriskowal/q (pretty much the same as Angular's $q)
var validator = require('validator');
var crypto = require('crypto');
var Utils = require('../server-files/utils');
var emails = require('../server-files/emails.js');
var texts = require('../server-files/texts.js');

var universityModel = require('./university');
var greekrush = require('./greekrush');

//DB fields that are visible to the user that is logged in
var userVisibleFields = [
	'Users_id',
	'Users_type',
	'Users_firstname',
	'Users_lastname',
	'Users_complete',
	'Users_profpic',
	'Users_email',
	'Users_edu',
	'Users_eduVerified',
	'Users_year',
	'Users_home',
	'Users_phone',
	'Users_phoneVerified',
	'Users_dob',
	'Users_gender',
	'Users_role',
	'Users_special',
	'Chapters_id',
	'Orgs_id',
	'Universities_id',
	'Council_id',
	'councils_ids',
	'ChapterUserRoles_name',
	'numChapterRequests',
	'gotFB'
];
var publicVisibleFields = [
	'Users_id',
	'Users_firstname',
	'Users_lastname',
	'Users_profpic',
	'Users_year',
	'Chapters_id',
	'Universities_id',
	'Councils_id',
	'Councils_name'
];

var methods = {

	getVisibleFields: function(){
		return publicVisibleFields;	
	},

	activeChapterUserRoles: ['m', 'president', 'exec', 'finance'],

	hashPassword: function(password, salt){
		return crypto.pbkdf2Sync(password, new Buffer(salt, 'base64'), 10000, 64).toString('base64');
	},

	logOut: function(session){
		delete session.user;
	},

	//session must be req.session from a route call
	isLoggedIn: function(session){
		if(Utils.isEmpty(session, 'user')){
			return false;
		}
		//this should never happen, but the id is so important that we'll check for it anyways
		else if(typeof session.user.Users_id !== 'number'){
			this.logOut(session);
			return false;
		}else{
			return true;
		}
	},

	getResetPasswordCode: function(user){
		var passwordTypeHash = this.hashPassword(user.Users_password + SECRET + user.Users_password, user.Users_passwordSalt);
		var sha256 = crypto.createHash('sha256').update(passwordTypeHash).digest('hex');
		return sha256;
	},

	sendResetPassword: function(data){
		var deferred = q.defer()
		errors = [];

		if(!validator.isEmail(data.Users_email)){
			errors.push('ERROR: Please enter a valid email address.');
		}

		if(errors.length){
			deferred.reject(errors);
		}else{
			db.fetchOne('select * from Users where Users_email = :Users_email', {
				Users_email: data.Users_email
			}).then(function(user){
				if(!user){
					errors.push('ERROR: The email you entered is incorrect. Please check the spelling and try again.');
				}

				if(errors.length){
					deferred.reject(errors);
				}else{
					var code = methods.getResetPasswordCode(user);
					var resetPasswordLink = URL + '#/passwordreset/' + user.Users_id + '/' + code;

					emails.forgotPassword(user.Users_email, resetPasswordLink).then(function(){
						deferred.resolve();
					}, function(error){
						deferred.reject(error);
					});
				}
			});
		}

		return deferred.promise;
	},

	resetPassword: function(params){
		var deferred = q.defer()
		errors = [];

		if(this.passwordError(params.password)){
			errors.push(this.passwordError(params.password));
		}

		db.fetchOne('select * from Users where Users_id = :Users_id', {
			Users_id: params.Users_id
		}).then(function(user){
			if(!user || params.code !== methods.getResetPasswordCode(user)){
				errors.push('ERROR: Sorry, there is something wrong with the URL parameters.');
			}

			if(errors.length){
				deferred.reject(errors);
			}else{
				db.update('Users', {
					Users_password: methods.hashPassword(params.password, user.Users_passwordSalt),
				}, user.Users_id).then(function(){
					deferred.resolve();
				}, function(error){
					deferred.reject(error);
				});
			}
		});

		return deferred.promise;
	},

	//use this to define the password rules
	passwordError: function(password){
		if(typeof password !== 'string' || Utils.isEmpty(password) || password.length < 8){
			return 'ERROR: The Password must be at least 8 characters long.';
		}

		return false;
	},

	loginUser: function(login_data){
		var deferred = q.defer()
		var errors = [];

		//server side validation of login data
		if(!validator.isEmail(login_data.Users_email)){
			errors.push('ERROR: Please enter a valid email.');
		}
// 		if(this.passwordError(login_data.Users_password)){
// 			errors.push(this.passwordError(login_data.Users_password));
// 		}

		//if there are no errors yet
		if(!errors.length){
			//fetch the user record by email address
			db.fetchOne('select * from Users where Users_email = :Users_email', {
				Users_email: login_data.Users_email
			}).then(function(user){
				if(!user){
					errors.push('ERROR: The email you entered is incorrect. Please check the spelling and try again.');
				}
				else if(user.Users_password !== methods.hashPassword(login_data.Users_password, user.Users_passwordSalt)){
					errors.push('ERROR: The password you entered is incorrect. Please try again.');
					
					if(methods.passwordError(login_data.Users_password)){
						errors.push(methods.passwordError(login_data.Users_password));
					}
				}else{
					
					return methods.get({
						Users_id: user.Users_id,
						Users_type: user.Users_type
					}, true);
				}
			}).then(function(users){
				
				if(errors.length){
					deferred.reject(errors);
				}else{
					//The user entered the correct credentials!

					deferred.resolve(users[0]);
				}
			}).catch(function(error){
				deferred.reject(error);
			});
		}else{
			deferred.reject(errors);
		}

		return deferred.promise;
	},

	get: function(options, isLoggedInUser){
		isLoggedInUser = typeof isLoggedInUser === 'undefined' ? false : isLoggedInUser;
		var deferred = q.defer();

		var userDeferreds = [];
		
		//not needed but saves some queries
		if(!Utils.isEmpty(options, 'Chapters_id')){
			options.Users_type = 'chapter';
		}
		
		//force options.Users_type to be an array
		if(!Utils.isEmpty(options, 'Users_type') && typeof options.Users_type === 'string'){
			options.Users_type = [options.Users_type];
		}
		else if(Utils.isEmpty(options, 'Users_type')){
			options.Users_type = ['default', 'chapter'];		//if no Users_type given, then use default to these types
		}

		//*** fetch extra event info per type ***
		
		if(options.Users_type.indexOf('default') !== -1){
			var wheres = [];
			var params = {};

			db.buildWheresParams(['Users'], options, wheres, params);
			
			wheres.push('Users_type = "default"');

			userDeferreds.push(db.fetchAll([
				'select *',
				'from Users',
				db.wheres(wheres)
			], params));
		}
		
		if(options.Users_type.indexOf('chapter') !== -1){
			var wheres = [];
			var params = {};

			db.buildWheresParams([
				'Users',
				'ChapterUsers',
				'ChapterUserRoles',
				'Chapters',
				'Orgs',
				'Councils',
				'Universities'
			], options, wheres, params);

			wheres.push('Users_type = "chapter"');

			if(typeof options.active !== 'undefined'){
				if(options.active){
					wheres.push('ChapterUserRoles_name in (' + db.escapeIn(methods.activeChapterUserRoles) + ')');
				}else{
					wheres.push('ChapterUserRoles_name not in (' + db.escapeIn(methods.activeChapterUserRoles) + ')');
				}
			}

			userDeferreds.push(db.fetchAll([
				'select *',
				'from Users',
				'join ChapterUsers on ChapterUsers_id = Users_id',
				'join ChapterUserRoles on ChapterUserRoles_id = ChapterUsers_joinChapterUserRoles_id',
				'join Chapters on Chapters_id = ChapterUsers_joinChapters_id',
				'join Orgs on Orgs_id = Chapters_joinOrgs_id',
				'join Chapters_x_Councils on Chapters_x_Councils_joinChapters_id = Chapters_id',
				'join Councils on Councils_id = Chapters_x_Councils_joinCouncils_id',
				'join Universities on Universities_id = Councils_joinUniversities_id',
				db.wheres(wheres)
			], params));
		}
		
		if(options.Users_type.indexOf('council') !== -1){
			var wheres = [];
			var params = {};

			db.buildWheresParams([
				'Users',
				'CouncilUsers',
				'Councils',
				'Universities'
			], options, wheres, params);

			wheres.push('Users_type = "council"');

			userDeferreds.push(db.fetchAll([
				'select *, GROUP_CONCAT(Councils_id) as councils_ids',
				'from Users',
				'join CouncilUsers on CouncilUsers_id = Users_id',
				'join CouncilUsers_x_Councils on CouncilUsers_x_Councils_joinCouncilUsers_id = CouncilUsers_id',
				'join Councils on Councils_id = CouncilUsers_x_Councils_joinCouncils_id',
				'join Universities on Universities_id = Councils_joinUniversities_id',

				//a council user is ALSO a chapter user, so join these columns too
				'join ChapterUsers on ChapterUsers_id = Users_id',
				'join ChapterUserRoles on ChapterUserRoles_id = ChapterUsers_joinChapterUserRoles_id',
				'join Chapters on Chapters_id = ChapterUsers_joinChapters_id',
				'join Orgs on Orgs_id = Chapters_joinOrgs_id',

				db.wheres(wheres),
				'group by Users_id'		//a user can be part of multiple councils
			], params));
		}
		
		if(options.Users_type.indexOf('org') !== -1){
			var wheres = [];
			var params = {};

			db.buildWheresParams([
				'Users',
				'OrgUsers',
				'Orgs'
			], options, wheres, params);

			wheres.push('Users_type = "org"');

			userDeferreds.push(db.fetchAll([
				'select *',
				'from Users',
				'join OrgUsers on OrgUsers_id = Users_id',
				'join Orgs on Orgs_id = OrgUsers_joinOrgs_id',
				db.wheres(wheres),
				'limit 1'
			], params));
		}
		
		if(options.Users_type.indexOf('university') !== -1){
			var wheres = [];
			var params = {};

			db.buildWheresParams([
				'Users',
				'UniversitiyUsers',
				'Universities'
			], options, wheres, params);

			wheres.push('Users_type = "university"');

			userDeferreds.push(db.fetchAll([
				'select *',
				'from Users',
				'join UniversityUsers on UniversityUsers_id = Users_id',
				'join Universities on Universities_id = UniversityUsers_joinUniversities_id',
				db.wheres(wheres),
				'limit 1'
			], params));
		}
		
		q.all(userDeferreds).then(function(userArrays){
			var users = [];
			userArrays.forEach(function(_users){
				users = users.concat(_users);
			});
			
			if(options.filtering !== false){
				users = users.map(function(user){
					if(isLoggedInUser){
						if(!Utils.isEmpty(user, 'Users_facebookinfo')){
							user.gotFB = true;
						}
						
						user = db.filterObject(user, userVisibleFields);
					}else{
						user = db.filterObject(user, publicVisibleFields);
					}

					return user;
				});
			}

			return methods.process(users, isLoggedInUser);
		}).then(function(users){
			deferred.resolve(users);
		}).catch(function(error){
			deferred.reject(error);
		});

		return deferred.promise;
	},

	textConfirmationCode: function(Users_id){
		var deferred = q.defer();
		var errors = [];

		if(Utils.isEmpty(Users_id)){
			errors.push('Users_id is blank.');
		}

		if(errors.length){
			deferred.reject(errors);
			return deferred.promise;
		}

		var user;

		//first, expire all of their pending codes if they have any
		db.sql([
			'update UserConfirmationCodes',
			'set',
			'	UserConfirmationCodes_status = "expired"',
			'where',
			'	UserConfirmationCodes_joinUsers_id = :Users_id',
			'	and UserConfirmationCodes_type = "text"'
		], {
			Users_id: Users_id
		}).then(function(){
			return methods.get({
				Users_id: Users_id
			}, true);
		}).then(function(users){
			user = users[0];
			
			if(Utils.isEmpty(user, 'Users_phone')){
				throw new Error('ERROR: Your phone number is blank');
			}
			if(user.Users_phoneVerified){
				throw new Error('ERROR: Your phone number is already verified.');
			}
			
			var code = Math.round(Math.random() * (9999999 - 1000000) + 1000000);

			return db.insert('UserConfirmationCodes', {
				UserConfirmationCodes_joinUsers_id: Users_id,
				UserConfirmationCodes_type: 'text',
				UserConfirmationCodes_code: code,
				UserConfirmationCodes_status: 'pending'
			});
		}).then(function(userConfirmationCode){
			return texts.send(user.Users_phone, 'Your GreekRush confirmation code is\n' + userConfirmationCode.UserConfirmationCodes_code);
		}).then(function(){
			deferred.resolve();
		}).catch(function(error){
			deferred.reject(error);
		})

		return deferred.promise;
	},

	emailConfirmationCode: function(Users_id){
		var deferred = q.defer();
		var errors = [];

		if(Utils.isEmpty(Users_id)){
			errors.push('Users_id is blank.');
		}

		if(errors.length){
			deferred.reject(errors);
			return deferred.promise;
		}
		
		var user;

		//first, expire all of their pending codes if they have any
		db.sql([
			'update UserConfirmationCodes',
			'set',
			'	UserConfirmationCodes_status = "expired"',
			'where',
			'	UserConfirmationCodes_joinUsers_id = :Users_id',
			'	and UserConfirmationCodes_type = "email"'
		], {
			Users_id: Users_id
		}).then(function(){
			return methods.get({
				Users_id: Users_id
			}, true);
		}).then(function(users){
			user = users[0];
			
			if(Utils.isEmpty(user, 'Users_edu')){
				throw new Error('ERROR: Your EDU email is blank');
			}
			if(user.Users_eduVerified){
				throw new Error('ERROR: Your EDU email is already verified.');
			}
			
			var code = Math.round(Math.random() * (9999999 - 1000000) + 1000000);

			return db.insert('UserConfirmationCodes', {
				UserConfirmationCodes_joinUsers_id: Users_id,
				UserConfirmationCodes_type: 'email',
				UserConfirmationCodes_code: code,
				UserConfirmationCodes_status: 'pending'
			});
		}).then(function(userConfirmationCode){
			return emails.emailConfirmationCode(user.Users_edu, userConfirmationCode.UserConfirmationCodes_code);
		}).then(function(){
			deferred.resolve();
		}).catch(function(error){
			deferred.reject(error);
		})

		return deferred.promise;
	},

	confirmConfirmationCode: function(Users_id, code){
		var deferred = q.defer();
		var errors = [];

		if(Utils.isEmpty(Users_id)){
			errors.push('Users_id is blank.');
		}
		if(Utils.isEmpty(code)){
			errors.push('The code cannot be blank.');
		}

		if(errors.length){
			deferred.reject(errors);
			return deferred.promise;
		}

		//first, expire all old pending confirmation codes
		db.sql([
			'update UserConfirmationCodes',
			'set',
			'	UserConfirmationCodes_status = "expired"',
			'where',
			'	UserConfirmationCodes_status = "pending"',
			'	and (',
			'		(UserConfirmationCodes_type = "text" && UserConfirmationCodes_created < NOW() - INTERVAL 5 MINUTE)',
			'		or (UserConfirmationCodes_type = "email" && UserConfirmationCodes_created < NOW() - INTERVAL 20 MINUTE)',
			'	)'
		]).then(function(){
			//now see if the code matches a still pending request
			return db.fetchOne([
				'select *',
				'from UserConfirmationCodes',
				'where',
				'	UserConfirmationCodes_status = "pending"',
				'	and UserConfirmationCodes_code = :code',
				'	and UserConfirmationCodes_joinUsers_id = :Users_id'
			], {
				code: code,
				Users_id: Users_id
			});
		}).then(function(usersConfirmationCode){
			if(Utils.isEmpty(usersConfirmationCode)){
				throw new Error('ERROR: Code is incorrect or it has expired.');
			}
			
			return db.update('UserConfirmationCodes', {
				UserConfirmationCodes_status: 'confirmed',
				UserConfirmationCodes_type: usersConfirmationCode.UserConfirmationCodes_type 	//just so it gets passed along
			}, usersConfirmationCode.UserConfirmationCodes_id);
		}).then(function(usersConfirmationCode){
			if(usersConfirmationCode.UserConfirmationCodes_type == 'text'){
				return db.update('Users', {
					Users_phoneVerified: 1
				}, Users_id);
			}
			else if(usersConfirmationCode.UserConfirmationCodes_type == 'email'){
				return db.update('Users', {
					Users_eduVerified: 1
				}, Users_id);
			}
		}).then(function(){
			deferred.resolve(true);
		}).catch(function(error){
			deferred.reject(error);
		});

		return deferred.promise;
	},

	removeUserCouncil: function(options){
		var deferred = q.defer();
		var errors = [];

		if(Utils.isEmpty(options, 'Users_id')){
			errors.push('Users_id required.');
		}
		if(Utils.isEmpty(options, 'councils_ids')){
			errors.push('councils_ids required.');
		}

		if(errors.length){
			deferred.reject(errors);
			return deferred.promise;
		}

		db.sql([
			'delete from CouncilUsers_x_Councils',
			'where',
			'	CouncilUsers_x_Councils_joinCouncilUsers_id = :Users_id',
			'	and CouncilUsers_x_Councils_joinCouncils_id in(' + db.escapeIn(options.councils_ids) + ')'
		], {
			Users_id: options.Users_id
		}).then(function(){
			//if they are no longer attached to any councils, then make them no longer a council user
			return db.fetchSinglet([
				'select COUNT(*) as num', 
				'from CouncilUsers_x_Councils',
				'where',
				'	CouncilUsers_x_Councils_joinCouncilUsers_id = :Users_id'
			], {
				Users_id: options.Users_id
			});
		}).then(function(numCouncils){
			if(numCouncils === 0){
				return db.update('Users', {
					Users_type: 'chapter'
				}, options.Users_id).then(function(){
					return db.delete('CouncilUsers', options.Users_id);
				}).then(function(){
					deferred.resolve();
				}).catch(function(error){
					deferred.reject(error);
				})
			}

			deferred.resolve();
		}).catch(function(error){
			deferred.reject(error);
		})

		return deferred.promise;
	},

	create: function(new_user_data){
		var deferred = q.defer()
		errors = [];

		//**Server side validation (there are some good validation libraries out there)**

		if(Utils.isEmpty(new_user_data, 'Users_firstname')){
			errors.push('ERROR: Please enter a first name.');
		}
		if(Utils.isEmpty(new_user_data, 'Users_lastname')){
			errors.push('ERROR: Please enter a first name.');
		}
		if(!validator.isEmail(new_user_data.Users_email)){
			errors.push('ERROR: Please enter a valid email.');
		}
		if(this.passwordError(new_user_data.Users_password)){
			errors.push(this.passwordError(new_user_data.Users_password));
		}
		if(Utils.isEmpty(new_user_data, 'Users_tos') || new_user_data.Users_tos !== '1'){
			errors.push('ERROR: Please agree to the User Agreement.');
		}

		//check if the email already exists
		db.fetchSinglet('select Users_id from Users where Users_email = :Users_email', {
			Users_email: new_user_data.Users_email
		}).then(function(Users_id){
			if(Users_id){
				errors.push('ERROR: This email is already taken.');
			}
		}).done(function(){
			if(errors.length){
				deferred.reject(errors);
			}else{
				var salt = crypto.randomBytes(16).toString('base64');
				var db_user = {
					Users_firstname: new_user_data.Users_firstname,
					Users_lastname: new_user_data.Users_lastname,
					Users_email: new_user_data.Users_email,
					Users_password: methods.hashPassword(new_user_data.Users_password, salt),
					Users_passwordSalt: salt
				}

				db.insert('Users', db_user).then(function(_new_user){
					var _new_user = db.filterObject(_new_user, userVisibleFields);

					deferred.resolve(_new_user);
				});
			}
		});

		return deferred.promise;
	},

	updateUniversity: function(Users_id, Users_gender, Universities_id){
		var deferred = q.defer();
		var errors = [];

		if(Utils.isEmpty(Users_id)){
			errors.push('Empty Users_id');
		}
		if(Utils.isEmpty(Universities_id)){
			errors.push('Empty Universities_id');
		}
		if(Utils.isEmpty(Users_gender)){
			errors.push('Empty Users_gender');
		}

		if(errors.length){
			deferred.reject(errors);
		}else{
			//add the user to the university's default chapter (based on their gender)
			db.sql([
				'insert into ChapterUsers(ChapterUsers_id, ChapterUsers_joinChapters_id, ChapterUsers_joinChapterUserRoles_id)',
				'values (',
				'	:Users_id,',
				'	(',
				'		select Chapters_id',
				'		from Chapters',
				'		join Chapters_x_Councils on Chapters_x_Councils_joinChapters_id = Chapters_id',
				'		join Councils on Councils_id = Chapters_x_Councils_joinCouncils_id',
				'		join Orgs on Orgs_id = Chapters_joinOrgs_id',
				'		where',
				'			Orgs_id = :Orgs_id',
				'			and Councils_joinUniversities_id = :Universities_id',
				'		limit 1',		//shouldn't be needed
				'	),',
				'	(select ChapterUserRoles_id from ChapterUserRoles where ChapterUserRoles_name = "m")',
				')'
			], {
				Users_id: Users_id,
				Orgs_id: Users_gender == 'male' ? DEFAULT_FRATERNITY_ORG_ID : DEFAULT_SORORITY_ORG_ID,
				Universities_id: Universities_id
			}).then(function(){
				greekrush.logRow('ChapterUsers', Users_id);
				
				return db.update('Users', {
					Users_type: 'chapter'
				}, Users_id);
			}).then(function(){
				deferred.resolve(Universities_id);
			});
		}

		return deferred.promise;
	},

	/* deprecated
	updateChapter: function(Users_id, data){
		var deferred = q.defer();
		var errors = [];

		if(Utils.isEmpty(Users_id)){
			errors.push('Empty Users_id');
		}
		if(Utils.isEmpty(data.Chapters_id)){
			errors.push('Empty Chapters_id');
		}

		if(errors.length){
			deferred.reject(errors);
		}else{
			var ChapterUserRolesSelect = '(select ChapterUserRoles_id from ChapterUserRoles where ChapterUserRoles_name = :ChapterUserRoles_name)';

			var sql = [
				'insert into ChapterUsers',
				'(ChapterUsers_id, ChapterUsers_joinChapters_id, ChapterUsers_joinChapterUserRoles_id)',
				'values',
				'(:Users_id, :Chapters_id, ' + ChapterUserRolesSelect + ')',
				'on duplicate key update',
				'\t'+'ChapterUsers_joinChapters_id = :Chapters_id,',
				'\t'+'ChapterUsers_joinChapterUserRoles_id = ' + ChapterUserRolesSelect
			];

			db.sql(sql, {
				Users_id: Users_id,
				Chapters_id: data.Chapters_id,
				ChapterUserRoles_name: typeof data.ChapterUserRoles_name === 'string' ? data.ChapterUserRoles_name : 'pnm'
			}).then(function(){
				deferred.resolve();
			});
		}

		return deferred.promise;
	},
	*/

	//instead of having allowAllFields, should maybe consider just having another update function to be used only by admins: adminUpdate()
	update: function(Users_id, data, allowAllFields){
		allowAllFields = typeof allowAllFields === 'undefined' ? false : allowAllFields;

		var deferred = q.defer();
		var errors = [];

		//filter the data so they can only update certain fields
		if(!allowAllFields){
			data = db.filterObject(data, [
				'Users_email',
				'Users_edu',
				// 'Users_password',	we'll have to hash it for them using hashPassword
				'Users_firstname',
				'Users_lastname',
				'Users_complete',
				'Users_gender',
				'Users_profpic',
				'Users_reasonsIds',
				'Users_dob',
				'Users_home',
				'Users_phone',
				'Users_studentid',
				'Users_year',
				'Users_inkBlob',
				'Users_facebookinfo'
			]);
		}

		//only allow user_complete to be set to complete if Users_phoneVerified is set (are we still planning on doing this?)
		var dobTimestamp = typeof data.Users_dob === 'number' ? data.Users_dob / 1000 : Utils.strtotime(data.Users_dob);
		if(!Utils.isEmpty(data, 'Users_dob') && dobTimestamp > Utils.strtotime('13 years ago')){
			errors.push('ERROR: Sorry, you must be at least 13 years old to use GreekRush');
		}
		
		if(!Utils.isEmpty(data, 'Users_email') && !validator.isEmail(data.Users_email)){
			errors.push('ERROR: Please enter a valid email.');
		}
		if(!Utils.isEmpty(data, 'Users_edu') && (!validator.isEmail(data.Users_edu) || data.Users_edu.toLowerCase().indexOf('.edu', data.Users_edu.length - 4) === -1)){
			errors.push('ERROR: ' + data.Users_edu + ' is not a valid .edu email address.');
		}
		
		if(errors.length){
			deferred.reject(errors);
			return deferred.promise;
		}
		
		//check if the email already exists (this should only happen if data has Users_email, but oh well.)
		db.fetchSinglet('select Users_id from Users where Users_email = :Users_email', {
			Users_email: data.Users_email
		}).then(function(existsing_users_id){
			if(!Utils.isEmpty(data, 'Users_email') && existsing_users_id != Users_id){
				throw new Error('ERROR: This email is already taken.');
			}
			
			return db.update('Users', data, Users_id);
		}).then(function(user){
			deferred.resolve(db.filterObject(user, userVisibleFields));
		}).catch(function(error){
			deferred.reject(error);
		});

		return deferred.promise;
	},

	addChapterRequest: function(Users_id, requestData){
		var deferred = q.defer();
		var errors = [];

		if(Utils.isEmpty(requestData, 'Chapters_id')){
			errors.push('No Chapter ID given.');
		}
		// if(Utils.isEmpty(requestData, 'ChapterRequests_joinChapterUserRoles_id')){
		// 	errors.push('No Role ID given.');
		// }

		if(errors.length){
			deferred.reject(errors);
		}else{
			db.insert('ChapterRequests', {
				ChapterRequests_joinUsers_id: Users_id,
				ChapterRequests_joinChapters_id: requestData.Chapters_id,
				ChapterRequests_joinChapterUserRoles_id: requestData.ChapterUserRoles_id || CHAPTERUSERROLES_id_m,
			}).then(function(_new_request){
				deferred.resolve(_new_request);
			});
		}

		return deferred.promise;
	},

	updateRecruitmentUsersStatuses: function(recruitmentusers_ids, RecruitmentUsers_status){
		var deferred = q.defer();
		var errors = [];
		var validStatuses = ['pending', 'approved', 'rejected'];

		if(Utils.isEmpty(recruitmentusers_ids)){
			errors.push('No recruitmentusers_ids given.');
		}
		if(validStatuses.indexOf(RecruitmentUsers_status) === -1){
			errors.push('RecruitmentUsers_status must be one of: ' + validStatuses.join(', '));
		}

		if(errors.length){
			deferred.reject(errors);
		}else{
			db.sql([
				'update RecruitmentUsers',
				'set RecruitmentUsers_status = :RecruitmentUsers_status',
				'where',
				'	RecruitmentUsers_id in (' + db.escapeIn(recruitmentusers_ids) + ')'
			], {
				RecruitmentUsers_status: RecruitmentUsers_status
			}).then(function(RecruitmentUser){
				deferred.resolve(RecruitmentUser);
			});
		}

		return deferred.promise;
	},

	followChapter: function(Users_id, Chapters_id){
		var deferred = q.defer();
		var errors = [];

		if(Utils.isEmpty(Users_id)){
			errors.push('Users_id required');
		}
		if(Utils.isEmpty(Chapters_id)){
			errors.push('Chapters_id required');
		}

		if(errors.length){
			deferred.reject(errors);
		}else{
			db.insertIgnore('ChapterFollowers', {
				ChapterFollowers_joinUsers_id: Users_id,
				ChapterFollowers_joinChapters_id: Chapters_id
			}).then(function(){
				deferred.resolve();
			});
		}

		return deferred.promise;
	},
    
    unfollowChapter: function(Users_id, Chapters_id){
		var deferred = q.defer();
		var errors = [];
		
		if(Utils.isEmpty(Users_id)){
			errors.push('Users_id required');
		}
		if(Utils.isEmpty(Chapters_id)){
			errors.push('Chapters_id required');
		}
		
		if(errors.length){
			deferred.reject(errors);
		}else{
             db.sql([
				 'delete from ChapterFollowers',
				 'where',
				 '	ChapterFollowers_joinUsers_id = :Users_id',
				 '	and ChapterFollowers_joinChapters_id = :Chapters_id'
			], {
				Users_id: Users_id, 
                Chapters_id: Chapters_id
			}).then(function(){
				deferred.resolve();
            }).catch(function(error){
                deferred.reject(error);
            });
		}

		return deferred.promise;
	},

	/*
	setChapterRequestStatus: function(ChapterRequests_id, userChapterRequests_status){
		var deferred = q.defer();
		var errors = [];

		if(Utils.isEmpty(ChapterRequests_id)){
			errors.push('No ChapterRequests_id given.');
		}
		if(Utils.isEmpty(userChapterRequests_status)){
			errors.push('No userChapterRequests_status given.');
		}

		if(errors.length){
			deferred.reject(errors);
		}else{
			db.update('ChapterRequests', {
				ChapterRequests_status: userChapterRequests_status
			}, ChapterRequests_id).then(function(UserChapterRequest){
				deferred.resolve(UserChapterRequest);
			});

			add user to chapter
		}

		return deferred.promise;
	},
	*/

	canSetUserType: function(user, options){
		var deferred = q.defer();
		var errors = [];

		if(Utils.isEmpty(user, 'Users_type') || user.Users_type != 'university'){
			errors.push('User is not a university user.');
		}
		if(Utils.isEmpty(user, 'Universities_id')){
			errors.push('User is not attached to a university');
		}
		if(Utils.isEmpty(options, 'Users_id')){
			errors.push('Users_id required.');
		}
		if(options.Users_type == 'council' && Utils.isEmpty(options, 'councils_ids')){
			errors.push('councils_ids required.');
		}

		if(errors.length){
			deferred.reject(errors);
			return deferred.promise;
		}

		var securityDeferreds = [];

		//make sure user is in the same university
		securityDeferreds.push(this.get({
			Users_id: options.Users_id,
			Universities_id: user.Universities_id
		}).then(function(user){
			if(Utils.isEmpty(user)){
				throw new Error('user is attached to a different university.');
			}
		}));

		if(options.User_type == 'council'){
			//make sure the councils are in the same university
			securityDeferreds.push(db.fetchSinglets([
				'select Councils_id',
				'from Councils',
				'where',
				'	Councils_id in (' + db.escapeIn(options.councils_ids) + ')',
				'	and Councils_joinUniversities_id = :Universities_id'
			], {
				Universities_id: user.Universities_id
			}).then(function(councils_ids){
				if(Utils.isEmpty(councils_ids) || councils_ids.length != options.councils_ids.length){
					throw new Error('not all councils belong to the logged in user\'s university');
				}
			}));
		}

		q.all(securityDeferreds).then(function(){
			deferred.resolve(true);
		}).catch(function(error){
			deferred.reject(error);
		})

		return deferred.promise;
	},

	setUserType: function(params){
		var deferred = q.defer();
		var errors = [];
		var validUserTypes = ['default', 'chapter', 'council', 'org', 'university'];

		if(Utils.isEmpty(params, 'Users_id')){
			errors.push('Users_id not specified');
		}
		if(Utils.isEmpty(params, 'Users_type') || validUserTypes.indexOf(params.Users_type) === -1){
			errors.push('Users_type must be one of: ' + validUserTypes.join(', '));
		}else{
			if(params.Users_type == 'council'){
				if(Utils.isEmpty(params, 'councils_ids')){
					errors.push('councils_ids required.');
				}
			}
		}

		if(errors.length){
			deferred.reject(errors);
		}else{
			//see if they already are set as this type
			// 			db.fetchSinglet('select Users_type from Users where Users_id = :Users_id', {Users_id: params.Users_id}).then(function(Users_type){
			// 				if(Users_type == params.Users_type){
			// 					deferred.reject('ERROR: User is already a ' + Users_type + 'user');
			// 				}
			if(params.Users_type == 'council'){
				db.insertIgnore('CouncilUsers', {
					CouncilUsers_id: params.Users_id
				}).then(function(){
					var inserts = [];
					params.councils_ids.forEach(function(councils_id){
						inserts.push({
							CouncilUsers_x_Councils_joinCouncilUsers_id: params.Users_id,
							CouncilUsers_x_Councils_joinCouncils_id: councils_id
						});
					});

					return db.insertIgnoreMultiple('CouncilUsers_x_Councils', inserts);
				}).then(function(CouncilUsers_x_Council){
					return db.update('Users', {
						Users_type: 'council'
					}, params.Users_id);
				}).then(function(user){
					deferred.resolve(user);
				}).catch(function(error){
					deferred.reject(error);
				});
			}else{
				deferred.reject(params.Users_type + ' not handled yet.');
			}
			// 			});
		}

		return deferred.promise;
	},

	vote: function(Users_id, ChapterUsers_id, ChapterRecruitments_id, vote){
		var deferred = q.defer()
		errors = [];

		if(Utils.isEmpty(Users_id)){
			errors.push('Users_id is required.');
		}
		if(Utils.isEmpty(ChapterUsers_id)){
			errors.push('ChapterUsers_id is required.');
		}
		if(Utils.isEmpty(ChapterRecruitments_id)){
			errors.push('ChapterRecruitments_id is required.');
		}

		if(errors.length){
			deferred.reject(errors);
		}else{
			db.insertIgnore('ChapterUserVotes', {
				ChapterUserVotes_joinUsers_id: Users_id,
				ChapterUserVotes_joinChapterUsers_id: ChapterUsers_id,
				ChapterUserVotes_joinChapterRecruitments_id: ChapterRecruitments_id,
				ChapterUserVotes_vote: vote
			}).then(function(vote){
				if(Utils.isEmpty(vote)){
					throw new Error('ERROR: You have already cast your vote for this user.');
				}

				deferred.resolve(vote);
			}).catch(function(error){
				deferred.reject(error);
			});
		}

		return deferred.promise;
	},

	comment: function(Users_id, ChapterUsers_id, ChapterRecruitments_id, comment){
		var deferred = q.defer()
		errors = [];

		if(Utils.isEmpty(Users_id)){
			errors.push('Users_id is required.');
		}
		if(Utils.isEmpty(ChapterUsers_id)){
			errors.push('ChapterUsers_id is required.');
		}
		if(Utils.isEmpty(ChapterRecruitments_id)){
			errors.push('ChapterRecruitments_id is required.');
		}

		if(errors.length){
			deferred.reject(errors);
		}else{
			db.insert('ChapterUserComments', {
				ChapterUserVotes_joinUsers_id: Users_id,
				ChapterUserVotes_joinChapterUsers_id: ChapterUsers_id,
				ChapterUserVotes_joinChapterRecruitments_id: ChapterRecruitments_id,
				ChapterUserVotes_comment: comment
			}).then(function(ChapterUserComment){
				deferred.resolve(ChapterUserComment);
			}).catch(function(error){
				deferred.reject(error);
			});
		}

		return deferred.promise;
	},

	getVotes: function(options){
		var deferred = q.defer()
		errors = [];

		if(Utils.isEmpty(options, 'ChapterRecruitments_id')){
			errors.push('ChapterRecruitments_id is required.');
		}

		if(errors.length){
			deferred.reject(errors);
		}else{
			var wheres = [];
			var params = {};

			db.buildWheresParams(['ChapterUserVotes', 'Users'], options, wheres, params);

			db.fetchAll([
				'select *',
				'from ChapterUserVotes',
				db.wheres(wheres)
			]).then(function(votes){
				deferred.resolve(votes);
			}).catch(function(error){
				deferred.reject(error);
			});
		}

		return deferred.promise;
	},

	getComments: function(options){
		var deferred = q.defer()
		errors = [];

		if(Utils.isEmpty(options, 'ChapterRecruitments_id')){
			errors.push('ChapterRecruitments_id is required.');
		}

		if(errors.length){
			deferred.reject(errors);
		}else{
			var wheres = [];
			var params = {};

			db.buildWheresParams(['ChapterUserComments', 'Users'], options, wheres, params);

			db.fetchAll([
				'select *',
				'from ChapterUserComments',
				db.wheres(wheres)
			]).then(function(comments){
				deferred.resolve(comments);
			}).catch(function(error){
				deferred.reject(error);
			});
		}

		return deferred.promise;
	},

	getChapterFollows: function(Users_id){
		var deferred = q.defer()
		errors = [];

		if(Utils.isEmpty(Users_id)){
			errors.push('Users_id is required.');
		}

		if(errors.length){
			deferred.reject(errors);
		}else{
			db.fetchAll([
				'select *',
				'from ChapterFollowers',
				'join Chapters on Chapters_id = ChapterFollowers_joinChapters_id',
				'where ChapterFollowers_joinUsers_id = :Users_id'
			], {
				Users_id: Users_id
			}).then(function(chapterFollows){
				deferred.resolve(chapterFollows);
			}).catch(function(error){
				deferred.reject(error);
			});
		}

		return deferred.promise;
	},

	//can pass in a single user
	process: function(_users, addPersonalData){
		var recruitmentModel = require('../models/recruitment');
		var deferred = q.defer();
		var users = [];
		var isSingle = false;
		var deferreds = [];
		addPersonalData = typeof addPersonalData === 'undefined' ? false : addPersonalData;

		if(!Utils.isEmpty(_users, 'Users_id')){
			isSingle = true;
			users = [_users];
		}
		else if(_users instanceof Array){
			users = _users;
		}else{
			deferred.reject('error in user model process()');
			return deferred.promise;
		}

		users.forEach(function(user){
			//if their role is set, then set the active flag
			if(!Utils.isEmpty(user, 'ChapterUserRoles_name')){
				user.active = methods.activeChapterUserRoles.indexOf(user.ChapterUserRoles_name) !== -1;
			}

			if(addPersonalData){
				if(!Utils.isEmpty(user, 'councils_ids')){
					user.councils_ids = user.councils_ids.split(',').map(Number);
				}

				if(user.Users_type == 'chapter'){
					if(user.ChapterUserRoles_name == 'president'){
						deferreds.push(db.fetchSinglet([
							'select COUNT(*)',
							'from ChapterRequests',
							'where',
							'	ChapterRequests_joinChapters_id = :Chapters_id',
							'	and ChapterRequests_status = "pending"'
						], {
							Chapters_id: user.Chapters_id
						}).then(function(numChapterRequests){
							user.numChapterRequests = numChapterRequests;
						}));
					}

					if(user.ChapterUserRoles_name == 'm'){
						deferreds.push(db.fetchAll([
							'select *',
							'from RecruitmentUsers',
							'join Recruitments on Recruitments_id = RecruitmentUsers_joinRecruitments_id',
							'where',
							'	RecruitmentUsers_joinUsers_id = :Users_id',
							'	and ' + require('./recruitment').isActiveWhereClause
						], {
							Users_id: user.Users_id
						}).then(function(recruitmentUsers){
							recruitmentUsers = recruitmentUsers.map(function(recruitmentUser){
								return db.filterObject(recruitmentUser, [
									'RecruitmentUsers_status',
									'RecruitmentUsers_requirements'
								].concat(require('./recruitment').getVisibleFields()));
							});
							user.recruitmentUsers = recruitmentUsers;
						}));
					}
					
					deferreds.push(methods.isInDefaultChapter(user.Users_id).then(function(isInDefaultChapter){
						user.isInDefaultChapter = isInDefaultChapter;

						//if the user is an active member of a real chapter, see if their chapter currently has an any active recruitments
						if(!isInDefaultChapter){
							return require('./recruitment').all({
								Chapters_id: user.Chapters_id,
								active: true
							});
						}
					}).then(function(chapterActiveRecruitments){
						user.chapterActiveRecruitments = chapterActiveRecruitments;
					}));
				}

				if(user.Users_type == 'university'){
					deferreds.push(recruitmentModel.all({
						Universities_id: user.Universities_id
					}).then(function(recruitments){
						user.recruitments = recruitments;
					}));
				}
			}
		});

		q.all(deferreds).then(function(){
			if(isSingle){
				deferred.resolve(users[0]);
			}else{
				deferred.resolve(users);
			}
		}).catch(function(error){
			deferred.reject(error);
		});

		return deferred.promise;
	},
	
	//if the user is currently part of the default Student Chapter for their university
	isInDefaultChapter: function(Users_id){
		var deferred = q.defer();
		var errors = [];

		if(Utils.isEmpty(Users_id)){
			errors.push('Users_id is required.');
		}

		if(errors.length){
			deferred.reject(errors);
			return deferred.promise;
		}
		
		db.fetchOne([
			'select *',
			'from Users',
			'join ChapterUsers on ChapterUsers_id = Users_id',
			'join Chapters on Chapters_id = ChapterUsers_joinChapters_id',
			'join Orgs on',
			'	Orgs_id in(' + db.escapeIn([DEFAULT_FRATERNITY_ORG_ID, DEFAULT_SORORITY_ORG_ID]) + ')',
			'	and Orgs_gender = Users_gender',
			'	and Orgs_id = Chapters_joinOrgs_id',
			'where',
			'	Users_id = :Users_id'
		], {
			Users_id: Users_id
		}).then(function(user){
			var isInDefaultChapter = !Utils.isEmpty(user);
			deferred.resolve(isInDefaultChapter);
		}).catch(function(error){
			deferred.reject(error);
		});

		return deferred.promise;
	}
}

module.exports = methods;