'use strict';

app.controller('RecruitmentsCtrl', function ($scope, api, User, $bootbox, Utils) {
	$scope.newRecruitment = {};
	$scope.edit = false;
	$scope.councils = [];
	
	var councils_ids = User.getCurrent().councils_ids;
	if(councils_ids.length == 1){
		$scope.newRecruitment.Recruitments_joinCouncils_id = councils_ids[0];
	}else{
		//TODO: if there are more than 1 council, we will need to fetch the actual councils so we have the names for the dropdown
		api.get('councils').then(function(councils){
			$scope.councils = councils;
		});
	}

	$scope.status = {
		isFirstOpen: true
	};

	//Create Organization
	$scope.createRecruitment = function () {
		$scope.newRecruitment.Recruitments_requirements = {
			requirements: $scope.requirements,
			otherInfo: $scope.otherInfo,
			otherTerms:$scope.otherTerms
		};
		api.post('recruitment/create', $scope.newRecruitment).then(function(recruitment){
			$scope.success = 'New Recruitment created!';
			$scope.err = '';
			$scope.newRecruitment = {};
			$scope.getRecruitments();	//update list
		}, function(errors){
			$scope.err = errors.join('<br />');
		});
	}

	$scope.parseRecs = function(selected){
		$scope.selected = selected;

		if(!Utils.isEmpty(selected.Recruitments_requirements)){
			console.log(selected.Recruitments_requirements);
			$scope.selected.recs = JSON.parse(selected.Recruitments_requirements);

		}

	}
	
	$scope.removeRec = function(rec , selected){
		selected.splice(rec, 1);
	}
	

	$scope.open = function($event) {
		$event.preventDefault();
		$event.stopPropagation();
		// 		console.log('opened');
		$scope.opened = true;
	};

	// 	$bootbox.alert("Hello world!");
	// 	console.log($bootbox);

	//List Recruitments

	$scope.getRecruitments = function(){
		api.get('council_user/recruitments').then(function(recruitments){
			$scope.recruitments = recruitments;
		});
	}


	api.get('council_user/recruitments',{
		attachChapterRecruitments: true
	}).then(function(recruitments){
		$scope.recruitments = recruitments;
		console.log(recruitments);
	});

	$scope.recs = [];
	$scope.requirements = []
	
	$scope.infos = [];
	$scope.otherInfo = []
	
	$scope.terms = [];
	$scope.otherTerms = []

	$scope.addNew = function(collection){
		var rec = {
			key:'',
			value:''
		};
		collection.push(rec);
	}
	
	$scope.moveTo = function(thing , from , to){
		to.push(thing);
		from.splice(thing);
	}
	
	$scope.assignChapter = function(chapter , recruitment){
		api.post('/recruitment/assign_chapter',{
			Recruitments_id:recruitment.Recruitments_id,
			Chapters_id: chapter.Chapters_id
		}).then(function(yay){
			console.log(yay);
		})
	}

	$scope.chapterList = [];
	$scope.checkChapter = function(chapter){
		if(chapter.isChecked===true){
			console.log("Check");
			$scope.chapterList.push(chapter);
		}
		if(chapter.isChecked===false){
			
			console.log("UnCheck");
		}
	}
	var user = angular.copy($scope.currentUser);
	
	api.get('chapters', {
		Universities_id: user.Universities_id,
		Orgs_gender: user.Users_gender
	}).then(function(chapters){
		$scope.chapters = chapters;
	})
	
// 	$scope.saveInfo = function(info){
// 		$scope.otherInfo.push(info);
// 		$scope.infos.splice(info);
// 	}
// 	$scope.saveTerm = function(term){
// 		$scope.otherTerms.push(term);
// 		$scope.terms.splice(term);
// 	}
// 		$scope.addInfo = function(collection){
// 		var info = {
// 			name:'',
// 			value:''
// 		};
// 		collection.push(info);
// 	}
// 	$scope.addTerms = function(collection){
// 		var term = {
// 			name:'',
// 			content:''
// 		};
// 		collection.push(term);
// 	}

})
.controller('RecruitmentCtrl', function ($scope, api, $routeParams, $filter, Utils, $q) {

	$scope.reverse = false;
	$scope.perPage = 10;
	$scope.pageNum = 1;
	$scope.predicate = '';
	$scope.search = "";
	$scope.numPages = 1;

	// 	$scope.watchers = [$scope.reverse , $scope.perPage, $scope.pageNum, $scope.predicate];

	var paginate = function(data, perPagestring , sortBy , search, reverse, pageNumstring){
		var deferred = $q.defer();
		var perPage = parseInt(perPagestring);
		var pageNum = parseInt(pageNumstring);
		var filtered = $filter('filter')(data , {$:search});
		var sorted = $filter('orderBy')(filtered, sortBy, reverse);
		var numPages = Math.ceil(sorted.length/perPage);
		$scope.totalNum = sorted.length;
		$scope.numPages = numPages;
		var start = perPage*(pageNum-1);
		if(pageNum*perPage >=sorted.length){
			var pageData = sorted.slice(start);
			deferred.resolve(pageData);
		}
		else{
			var end = perPage;
			var pageData = sorted.slice(start , end);
			deferred.resolve(pageData);
		}
		return deferred.promise;
	}

	api.get('recruitment', {
		Recruitments_id: $routeParams.Recruitments_id
	}).then(function(recruitment){
		$scope.recruitment = recruitment;
	}).then(function(){
		api.get('recruitment_users',{
			Recruitments_id: $routeParams.Recruitments_id,
			RecruitmentUsers_status: 'pending'
		}).then(function(users){
			var numPages = Math.ceil(users.length/$scope.perPage);
			$scope.users = users;
			paginate(users , $scope.perPage, $scope.predicate,$scope.search, $scope.reverse, $scope.pageNum).then(function(pageData){
				$scope.pageData = pageData;
			});
		})
	});


	$scope.$watchCollection('[perPage, predicate, search.$, reverse, pageNum, users]',function(newVals, oldVals){
		if(!Utils.isEmpty(oldVals)){
			if(newVals[0]===''){
				return false;
			}
			else{
				paginate(newVals[5] , newVals[0], newVals[1], newVals[2], newVals[3], newVals[4]).then(function(pageData){
					$scope.pageData = pageData;
				});
			}
		}
		else if(Utils.isEmpty(oldVals)&& !Utils.isEmpty(newVals[4])){
			if(newVals[0]===''){
				return false;
			}
			else{
				paginate(newVals[5] , newVals[0], newVals[1], newVals[2], newVals[3], newVals[4]).then(function(pageData){
					$scope.pageData = pageData;
				});
			}
		}
		// 		else if(newVals[0]!==''){
		// 			paginate($scope.users , newVals[0], newVals[1], newVals[2], newVals[3], newVals[4]);
		// 		}

	});





});
