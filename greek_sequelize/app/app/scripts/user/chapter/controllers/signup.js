'use strict';

/**
 * @ngdoc function
 * @name greekRush.common.controllers:HeaderCtrl
 * @description
 * # HeaderCtrl
 * Controller of the greekRush
 */

app.controller('SignUpCtrl', function ($scope, User, $location, $rootScope, $anchorScroll, Utils, api, Facebook,$bootbox, $http) {
	$scope.otherInfo = {};
	var form = ['info', 'pic','university', 'active', 'chapter', 'verify','complete'];
	$scope.section = form[0];
	$scope.stage = 1;
	$scope.facebookStatus = function(){
		Facebook.getLoginStatus(function(response) {
			console.log(response);
		});
	}

	var user = User.getCurrent();

	$scope.currentUser = user;
	$scope.gotFB = user.gotFB;
	
	if(!Utils.isEmpty(user, 'Users_dob')){
		$scope.date = new Date(user.Users_dob);
	}else{
		$scope.date = new Date(new Date().setMonth(new Date().getYear() - 324));
	}
	if(!Utils.isEmpty(user, 'Users_gender')){
		$scope.otherInfo.gender = user.Users_gender;
	}
	if(!Utils.isEmpty(user, 'Users_phone')){
		$scope.otherInfo.phone = user.Users_phone;
	}
	if(!Utils.isEmpty(user, 'Users_home')){
		$scope.otherInfo.home = user.Users_home;
	}
	if(!Utils.isEmpty(user, 'Users_year')){
		$scope.otherInfo.year = user.Users_year;
	}
	if(!Utils.isEmpty(user, 'Users_edu')){
		$scope.otherInfo.edu = user.Users_edu;
	}
	
	$scope.frat_soro = user.Users_gender == 'male' ? 'fraternity' : 'sorority';
	
	if(!Utils.isEmpty(user, 'Users_complete') && user.Users_complete === 'complete') {
		$location.url('/home');
// 		$scope.section = form[6];
// 		$scope.progress = 100;
	}
	if(!Utils.isEmpty(user, 'Users_complete') && user.Users_complete === 'verify') {
		$scope.section = form[5];
		$scope.stage = 6;
		$scope.progress = 100;
	}
	else if (!Utils.isEmpty(user, 'Users_complete') && user.Users_complete === 'chapter') {
		$scope.section = form[4];
		$scope.stage = 5;
		$scope.progress = 80;
	}
	else if (!Utils.isEmpty(user, 'Users_complete') && user.Users_complete === 'active') {
		$scope.section = form[3];
		$scope.stage = 4;
		$scope.progress = 60;

	}
	else if(!Utils.isEmpty(user, 'Users_complete') && user.Users_complete === 'university') {
		$scope.section = form[2];
		$scope.stage = 3;
		$scope.progress = 40;
	}
	else if (!Utils.isEmpty(user, 'Users_complete') && user.Users_complete === 'pic') {
		$scope.section = form[1];
		$scope.stage = 2;
		$scope.progress =20;
	}
	else{
		$scope.section = form[0];
		$scope.progress = 0;
	}

	$scope.maxDate = new Date();

	$scope.setUniversity = function (universityId) {
		universityId = universityId || this.university.Universities_id;
		
		User.updateUniversity({
			Universities_id: universityId
		}).then(function(updatedUser){
			$scope.section = updatedUser.Users_complete;
			$scope.progress = 60;
			$scope.stage = 4;

			// 			api.post('user',{
			// 				Users_eduemail:
			// 			}).then(function(updatedUser){
			// 			$scope.section = updatedUser.Users_complete;
			// 			$scope.progress = 20;
			// 			});
		});
	}

	$scope.setStatus = function (type) {
		if (type) {
			api.call('user',{
				method: 'POST',
				data: {
					Users_complete: 'chapter'
				}
			}).then(function(updatedUser){
				$scope.section = updatedUser.Users_complete;
				$scope.progress = 80;
				$scope.stage = 5;
			})
		} else {
			api.call('user',{
				method: 'POST',
				data: {
					Users_complete: 'verify'
				}
			}).then(function(updatedUser){
				console.log(updatedUser);
				$scope.section = updatedUser.Users_complete;
				$scope.stage = 6;
				$scope.progress = 100;
			})
		}
	}

	$scope.notActive = function(){
		api.call('user',{
			method: 'POST',
			data: {
				Users_complete: 'active'
			}
		}).then(function(updatedUser){
			$scope.section = updatedUser.Users_complete;
			$scope.stage = 4;
			$scope.progress = 60;
		})
	}

	$scope.setChapter = function (chapterId) {
		chapterId = chapterId || this.chapter.Chapters_id;
		
		User.updateChapter({
			Chapters_id: chapterId
		}).then(function(updatedUser){
			$scope.section = updatedUser.Users_complete;
			$scope.stage = 6;
			$scope.progress = 100;
		});
	}

	$scope.connectFB = function(){
		Facebook.login(function(response) {
			console.log(response);
			if(response.status == 'connected' && response.authResponse){
				Facebook.api('/me', function(fb_user){
// 					console.log(fb_user);
					api.post('user', {
						Users_facebookinfo: JSON.stringify({
							authResponse: response.authResponse,
							data: fb_user
						}),
						Users_gender: fb_user.gender,
						Users_dob: (new Date(fb_user.birthday))
					}).then(function(user){
						User.setCurrent(user);
						$scope.otherInfo.gender = user.Users_gender;
						$scope.date = user.Users_dob;
						$scope.gotFB = user.gotFB;
					});
				});
				// could create 2 promises for /me and /me/picture then show Finished when both are done, but I think it's OK to fetch the picture in the background and consider the user Finished when we've gotten their /me details.
				Facebook.api('/me/picture', {
					redirect: false,
					type: 'large'
				}, function(picture){
					api.post('user', {
						Users_profpic: picture.data.url
					}).then(function(user){
						User.setCurrent(user);
					});
				});
			}
		}, {
			scope: 'public_profile, user_birthday, user_education_history'
		});
	}


	$scope.getLocation = function(val) {
		return $http.get('http://maps.googleapis.com/maps/api/geocode/json', {
			params: {
				address: val,
				sensor: false
			}
		}).then(function(res){
			var addresses = [];
			angular.forEach(res.data.results, function(item){
				addresses.push(item.formatted_address);
			});
			return addresses;
		});
	};

	$scope.pickAndStore = function () {
		var picker_options = {
			multiple: false,
			folders: false,
			services: ['COMPUTER', 'DROPBOX','INSTAGRAM','WEBCAM'] 
		};
		var store_options = {
			location: 'S3',
			path: '/profPics/',
			access: 'public'
		}
		filepicker.pickAndStore(picker_options, store_options, function (InkBlob) {
			$scope.blob = InkBlob;
			//console.log('Inf URL:' + JSON.stringify(InkBlob[0]) + ' S3 Key:' + InkBlob[0].url);
			api.post('user',{
				Users_profpic: InkBlob[0].url,
				Users_inkBlob: JSON.stringify(InkBlob[0]),
				Users_complete: 'university'
			}).then(function(updatedUser){
				User.setCurrent(updatedUser);
				if(updatedUser.Users_complete === 'university'){
					$scope.section = updatedUser.Users_complete;
					$scope.progress = 40;
					$scope.stage = 3;
				}
				else{
					console.log('Returned User: '+updatedUser);
				}
			});
		}, function (FPError) {
			console.log(FPError);
		});
	}

	$scope.next = function(){
		api.post('user',{
			Users_complete: 'university'
		}).then(function(updatedUser){
			User.setCurrent(updatedUser);
			if(updatedUser.Users_complete === 'university'){
				$scope.section = updatedUser.Users_complete;
				$scope.progress = 40;
				$scope.stage = 3;
			}
			else{
				console.log('Returned User: '+updatedUser);
			}
		});
	}

	$scope.showUniversity = function(university){
		$scope.selected = university;
	}

	$scope.showChapter = function(chapter){
		$scope.selected = chapter;
	}
	//Get University Names for Chapter Create Form
	$scope.getUniversityNames = function () {
		api.call('universities').then(function(universities){
			$scope.universities = universities;
			var count = universities.length;
			console.log(universities.length );
			if(count<=3){
				$scope.cols = 12/count;
			}
			else{
				$scope.cols = 4;
			}
		});
	}


	$scope.chaptersOfUni = function () {
		api.get('chapters', {
			Orgs_gender: $scope.currentUser.Users_gender,
			Universities_id:$rootScope.currentUser.Universities_id
		}).then(function(chapters){
			$scope.chapters = chapters;
		});
	}

	//Personal Info Section

	$scope.updateInfo = function () {

		var otherInfo = angular.copy($scope.otherInfo);

		function showErrors(errors){
			//$scope.error = errors.join('<br />');
			$bootbox.dialog({
				message: errors.join('<br />')
			})
		}

		var errors = [];

		//** Client side error checking **

		if(otherInfo.gender===''){
			errors.push('Please specify your Gender.');
		}
		if(otherInfo.phone == ''){
			errors.push('Please enter your Phone Number.');
		}
		if(otherInfo.edu == ''){
			errors.push('Please enter your Phone Number.');
		}
		if(errors.length){
			showErrors(errors);
		}else{
			console.log($scope.date);
			User.update({
				Users_phone: otherInfo.phone,
				Users_year: otherInfo.year,
				Users_home: otherInfo.home,
				Users_gender: otherInfo.gender,
				Users_edu: otherInfo.edu,
				Users_complete: 'pic',
				Users_dob: (new Date($scope.date))
			}).then(function(updatedUser){
				User.setCurrent(updatedUser);
				$scope.section = updatedUser.Users_complete;
				$scope.progress = 20;
				$scope.stage = 2;
				$scope.emailCode(false);
				$scope.frat_soro = updatedUser.Users_gender == 'male' ? 'fraternity' : 'sorority';
			});
		}
	}

	// VERFICATION SECTION
	$scope.editing = {
		edu:false,
		phone:false
	};

	$scope.code={
		text:'',
		email:''
	}
	$scope.textCode = function(showMsg){
		if($scope.currentUser.Users_phoneVerified!==1){
			api.post('text_confirmation_code').then(function(something){
				console.log(something);
				var msg = 'Text Message Sent';
				if(showMsg){
					$bootbox.dialog({
						message: msg
					});
				}
			})
		}
	}
	$scope.confirm = function(code){
		api.post('confirm_confirmation_code',{
			code:code
		}).then(function(what){
			if(what){
				User.getUserFromDB().then(function(user){
					$scope.currentUser = user;
					
					if(user.Users_phoneVerified && user.Users_eduVerified){
						User.update({
							Users_complete: 'complete'
						}).then(function(updatedUser){
							$scope.currentUser = user;
						});
					}
				});
			}
		})
	}

	$scope.emailCode = function(showMsg){
		if($scope.currentUser.Users_eduVerified!==1){
			api.post('email_confirmation_code').then(function(something){
				console.log(something);
				var msg = 'University Email Verification Sent';
				if(showMsg){
					$bootbox.dialog({
						message: msg
					});
				}
			})
		}
	}

	$scope.editPhone = function (updated) {
		var errors = [];

		//** Client side error checking **

		if(updated == ''){
			errors.push('Please enter your Phone Number.');
		}
		else{
			User.update({
				Users_phone: updated,
				Users_phoneVerified: 0
			}).then(function(updatedUser){
				User.setCurrent(updatedUser);
				$scope.editing.phone = false;
				$scope.currentUser = updatedUser;
				$scope.textCode(true);
			});
		}
	}

	$scope.editEdu = function (updated) {
		var errors = [];

		//** Client side error checking **

		if(updated == ''){
			errors.push('Please enter your University Email.');
		}
		else{
			User.update({
				Users_edu: updated,
				Users_eduVerified: 0
			}).then(function(updatedUser){
				$scope.editing.edu = false;
				User.setCurrent(updatedUser);
				$scope.currentUser = updatedUser;
				$scope.emailCode(true);
			});
		}
	}

	//END OF VERIFICATION SECTION


	$scope.edit = false;

	$scope.maxDate =  new Date();
	$scope.today = function () {
		$scope.dt = new Date();
	};
	$scope.today();

	$scope.clear = function () {
		$scope.dt = null;
	};


	$scope.toggleMin = function () {
		$scope.minDate = $scope.minDate ? null: new Date();
	};
	$scope.toggleMin();

	$scope.open = function ($event) {

		$event.preventDefault();
		$event.stopPropagation();

		$scope.opened = true;
	};

	$scope.dateOptions = {
		singleDatePicker: true,
		startingDay: 1
	};

	$scope.initDate = new Date('2016-15-20');
	$scope.formats = ['dd-MMMM-yyyy', 'yyyy/MM/dd', 'dd.MM.yyyy', 'shortDate'];
	$scope.format = $scope.formats[3];

});
