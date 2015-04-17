'use strict';

/**
 * @ngdoc function
 * @name greekRush.common.controllers:HeaderCtrl
 * @description
 * # HeaderCtrl
 * Controller of the greekRush
 */

app.controller('MyRecruitmentCtrl', function ($scope, api, $routeParams, User, Utils, $location, $filter, $bootbox) {


	var user = User.getCurrent();

	$scope.currentUser = user;


	api.get('recruitments', {
		active: true,
		Councils_gender: user.Users_gender,
		Universities_id: user.Universities_id
	}).then(function(recruitments){
		if(recruitments.length>0){
			console.log('Recruitments '+recruitments[0]);
			$scope.selected = recruitments[0];
			$scope.selected.recs = JSON.parse(recruitments[0].Recruitments_requirements);
			api.get('recruitments',{
				Recruitments_id: $scope.selected.Recruitments_id,
				attachChapterRecruitments: true,
			}).then(function(info){
				console.log(info);
			});
			api.get('chapters', {
				Universities_id: user.Universities_id,
				Orgs_gender: user.Users_gender,
				attachChapterRecruitments: true,
				Recruitments_id: recruitments[0].Recruitments_id
			}).then(function(chapters){
				$scope.chapters = chapters;
				console.log(chapters);
			});
		}

	});


	api.get('university', {
		Universities_id: user.Universities_id
	}).then(function(university){
		$scope.university = university;
	});

	$scope.event={};
	$scope.event.date = new Date();
	$scope.event.start = new Date();
	$scope.event.end = new Date();

	$scope.mytime = new Date();

	$scope.hstep = 1;
	$scope.mstep = 15;

	$scope.options = {
		hstep: [1, 2, 3],
		mstep: [1, 5, 10, 15, 25, 30]
	};

	$scope.ismeridian = true;


	$scope.update = function() {
		var d = new Date();
		d.setHours( 14 );
		d.setMinutes( 0 );
		$scope.mytime = d;
	};

	$scope.changeDate = function () {
		var year = $scope.event.date.getFullYear();
		var month = $scope.event.date.getMonth();
		var day = $scope.event.date.getDate();
		$scope.event.start.setFullYear(year);
		$scope.event.start.setMonth(month);
		$scope.event.start.setDate(day);
		$scope.event.end = $scope.event.start;
	};

	$scope.changeStart = function () {
		if($scope.event.start.getTime()>=$scope.event.end.getTime()){
			$scope.event.end = $scope.event.start;
			var year = $scope.event.date.getFullYear();
			var month = $scope.event.date.getMonth();
			var day = $scope.event.date.getDate();
			$scope.event.start.setFullYear(year);
			$scope.event.start.setMonth(month);
			$scope.event.start.setDate(day);
		}
	};

	$scope.changeEnd = function () {
		if($scope.event.start.getTime()>$scope.event.end.getTime()){
			$scope.event.start = $scope.event.end;
			var year = $scope.event.date.getFullYear();
			var month = $scope.event.date.getMonth();
			var day = $scope.event.date.getDate();
			$scope.event.start.setFullYear(year);
			$scope.event.start.setMonth(month);
			$scope.event.start.setDate(day);
		}
	};

	$scope.clear = function() {
		$scope.mytime = null;
	};

	$scope.assignContact = function(info){
		$scope.event.contact = info;
	}

	$scope.assignContactMe = function(){
		var info = {
			name: $scope.currentUser.Users_firstname+' '+$scope.currentUser.Users_lastname,
			email: $scope.currentUser.Users_email,
			phone: $scope.currentUser.Users_phone
		}
		$scope.event.contact = info;
	}


});
