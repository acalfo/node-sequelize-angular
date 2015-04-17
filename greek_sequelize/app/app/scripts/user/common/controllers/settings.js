'use strict';

/**
 * @ngdoc function
 * @name greekRush.common.controllers:HeaderCtrl
 * @description
 * # HeaderCtrl
 * Controller of the greekRush
 */

app.controller('UserSettingsCtrl', function ($scope, User, $location, $rootScope, $anchorScroll, Utils, api, Facebook) {

	$scope.edit = false;
	$scope.newPic = false;
	$scope.success = '';

	$scope.userCopy = angular.copy($scope.currentUser);

	$scope.pickAndStore = function () {
		var picker_options = {
			multiple: false,
			folders: false
		};
		var store_options = {
			location: 'S3',
			path: '/profPics/',
			access: 'public'
		}
		filepicker.pickAndStore(picker_options, store_options,function (InkBlob) {
			$scope.blob = InkBlob;
			console.log('Inf URL:' + JSON.stringify(InkBlob[0]) + ' S3 Key:' + InkBlob[0].url);

			$scope.userCopy.Users_profpic = InkBlob[0].url;
			$scope.userCopy.Users_inkBlob= JSON.stringify(InkBlob[0]);
			$scope.newPic = true;

		}, function (FPError) {
			console.log(FPError);
		});
	}

	$scope.reset = function(){
		$scope.userCopy = angular.copy($scope.currentUser);
		$scope.edit = false;
		$scope.newPic = false;
	}
	$scope.update = function(){
		$scope.loading = true;
		var copy = angular.copy($scope.userCopy);
		console.log(copy);
		if($scope.newPic === true){
			api.post('user',{
				Users_firstname: copy.Users_firstname,
				Users_lastname: copy.Users_lastname,
				Users_email: copy.Users_email,
				Users_phone: copy.Users_phone,
				Users_home: copy.Users_home,
				Users_year: copy.Users_year,
				Users_profPic: copy.Users_profpic,
				Users_inkBlob: copy.Users_inkBlob
			}).then(function(updated){
				console.log(updated);
				User.setCurrent(updated);
				//$scope.userCopy = angular.copy($scope.currentUser);
				$scope.edit = false;
				$scope.newPic = false;
				$scope.loading = false;
				$scope.success = "Update complete!";
			});
		}
		else if(!$scope.newPic){
			
			api.post('user',{
				Users_firstname: copy.Users_firstname,
				Users_lastname: copy.Users_lastname,
				Users_email: copy.Users_email,
				Users_phone: copy.Users_phone,
				Users_home: copy.Users_home,
				Users_year: copy.Users_year
			}).then(function(updated){
				
				User.setCurrent(updated);
				$scope.userCopy = angular.copy($scope.currentUser);
				$scope.edit = false;
				$scope.loading = false;
				$scope.success = "Update complete!";
				
			});
		}

	}
});
