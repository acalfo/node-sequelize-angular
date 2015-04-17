'use strict';

/**
 * @ngdoc function
 * @name greekRush.common.controllers:HeaderCtrl
 * @description
 * # HeaderCtrl
 * Controller of the greekRush
 */

app.controller('ProfileCtrl', function ($scope, User, $location, $rootScope, $routeParams, Utils, api, Facebook) {
	console.log('Profile Controller');
	$scope.profile = function(){
		api.get('user',{
			Users_id:$routeParams.userId
		}).then(function(profile){
			console.log(profile);
			$scope.profile = profile;
		});
	};
    
});
