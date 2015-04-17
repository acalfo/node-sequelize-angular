'use strict';

app.factory('User', function ($rootScope, $location, $q, api, $timeout) {
	$rootScope.userGot = false;	//to determine if the user has been got at least once
	
	function set(user){
		console.log("set user function user = ", user);
		$rootScope.currentUser = user;
		$rootScope.$broadcast('user.set', user);
	}

	var User = {
		getUserFromDB: function(){
			var deferred = $q.defer();
			
			api.call('user').then(function(user){
				User.setCurrent(user);
				deferred.resolve(user);
			}, function(error){
				deferred.reject();
			}).finally(function(){
				if(!$rootScope.userGot){
					$timeout(function(){
						$rootScope.userGot = true;
					})
				}
			});
			
			return deferred.promise;
		},
		
		updateUniversity: function(new_data){
			var deferred = $q.defer();

// 			api.call('update_user_university', {
// 				method: 'POST',
// 				data: new_data
// 			}).then(function(updatedUser){
// 				api.call('user', {
// 					method: 'POST',
// 					data: {Users_complete: 'active'}
// 				}).then(function(updatedUser1){
// 					deferred.resolve(updatedUser1);
// 				}, function(errors){
// 					console.log(errors);
// 				});
// 			}, function(errors){
// 				console.log(errors);
// 			});
			
			api.post('update_user_university', new_data).then(function(updatedUser){
				return api.post('user', {Users_complete: 'active'});
			}).then(function(updatedUser){
				set(updatedUser);
				deferred.resolve(updatedUser);
			}).catch(function(errors){
				console.log(errors);
				deferred.reject(errors);
			});
			
			return deferred.promise;
		},
		
		updateChapter: function(new_data){
			var deferred = $q.defer();

// 			api.call('user/join_chapter', {
// 				method: 'POST',
// 				data: new_data
// 			}).then(function(updatedUser){
// 				api.call('user', {
// 					method: 'POST',
// 					data: {Users_complete: 'info'}
// 				}).then(function(updatedUser){
// 					console.log(updatedUser);
// 					deferred.resolve(updatedUser);
// 				}, function(errors){
// 					console.log(errors);
// 				});
// 			}, function(errors){
// 				console.log(errors);
// 			});
			
			api.post('user/join_chapter', new_data).then(function(updatedUser){
				return api.post('user', {Users_complete: 'verify'});
			}).then(function(updatedUser){
				set(updatedUser);
				deferred.resolve(updatedUser);
			}).catch(function(errors){
				console.log(errors);
				deferred.reject(errors);
			});

			return deferred.promise;
		},

		getCurrent: function () {
			return $rootScope.currentUser;
		},

		signedIn: function () {
			return typeof $rootScope.currentUser !== 'undefined' && $rootScope.currentUser !== null;
		},
		
		getSpecial: function () {
			var current = User.getCurrent();
			return current.special;
		},
		
		update: function(new_data){
			var deferred = $q.defer();

			api.call('user', {
				method: 'POST',
				data: new_data
			}).then(function(updatedUser){
				set(updatedUser);

				deferred.resolve(updatedUser);
			});

			return deferred.promise;
		},
		
		setCurrent: function (user) {
			set(user);
		},
		
		logout: function(){
			api.call('user/logout').then(function(response){
				delete $rootScope.currentUser;
				$location.path('/');
			});
		}
	};

	$rootScope.signedIn = function () {
		return User.signedIn();
	};


	return User;

});
