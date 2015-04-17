'use strict'

angular
.module('theme.navigation-controller', [])
.controller('NavigationController', function ($scope, $rootScope, $location, $timeout, $global, User, $filter, Utils, api, $q) {
	// Setting Navbar Tabs Based on auth status
	$scope.publicNavTabs = [{
		label: "Join",
		iconClasses: 'fa fa-rocket',
		url: "#/register"
	}, {
		label: "Login",
		iconClasses: 'fa fa-home',
		url: "#/login"
	}, {
		label: "Organizations",
		iconClasses: 'fa fa-shield',
		url: "#/organizations"
	}, {
		label: "Universities",
		iconClasses: 'fa fa-university',
		url: "#/universities"
	}, {
		label: "About",
		iconClasses: 'fa fa-plus',
		url: "#/about"
	}];

	$scope.mainNavTabs = [{
		label: "Home",
		iconClasses: 'fa fa-home',
		url: "#/home"
	}, {
		label: "Organizations",
		iconClasses: 'fa fa-shield',
		url: "#/organizations"
	}, {
		label: "Universities",
		iconClasses: 'fa fa-university',
		url: "#/universities"
	}];
// 	}, {
// 		label: "Events",
// 		iconClasses: 'fa fa-calendar',
// 		url: "#/events"
// 	}];

	$scope.openItems = [];
	$scope.selectedItems = [];
	$scope.selectedFromNavMenu = false;

	var setParent = function (children, parent) {
		angular.forEach(children, function (child) {
			child.parent = parent;
			if (child.children !== undefined) {
				setParent (child.children, child);
			}
		});
	};

	function findItemByUrl(children, url) {
		for (var i = 0, length = children.length; i<length; i++) {
			if (children[i].url && children[i].url.replace('#', '') == url){
// 				console.log(children[i]);
				return children[i];
			}
			
			if (children[i].children !== undefined) {
				var item = findItemByUrl (children[i].children, url);
				if (item) return item;
			}
		}
	};

	$scope.select = function(item) {
		if (item.open) {
			item.open = false;
			return;
		}
		
		closeOpenNodes();
		
		var parentRef = item;
		while (parentRef != null) {
			parentRef.open = true;
			$scope.openItems.push(parentRef);
			parentRef = parentRef.parent;
		}

		// handle leaf nodes
		if (!item.children || (item.children && item.children.length<1)) {
			$scope.selectedFromNavMenu = true;
			for (var j = $scope.selectedItems.length - 1; j >= 0; j--) {
				$scope.selectedItems[j].selected = false;
			};
			$scope.selectedItems = [];
			var parentRef = item;
			while (parentRef != null) {
				parentRef.selected = true;
				$scope.selectedItems.push(parentRef);
				parentRef = parentRef.parent;
			}
		};
	};
	
	function highlightNav(newVal){
		var item;
		if(!User.signedIn()){
			item = findItemByUrl($scope.publicNavTabs, newVal);
		}else{
			item = findItemByUrl($scope.mainNavTabs, newVal) ||  findItemByUrl($scope.subNavTabs, newVal);
		}
		
		if (item){
			$scope.select(item);
		}else{
			//doesn't seem to be working...
			//closeOpenNodes();
		}
	}

	$scope.subNavTabs = [];
	var buildingSubNav = false;
	function setSubNavTabs(){
		if(buildingSubNav){
			return;
		}
		
		buildingSubNav = true;
		$scope.subNavTabs = [];
		var deferreds = [];

		if(User.signedIn()){
			var currentUser = User.getCurrent();

			if(currentUser.Users_complete != 'complete'){
				$scope.subNavTabs = [{
					label: "Complete Information",
					iconClasses: 'fa fa-edit',
					url: "#/complete-info"
				}];
			}else{
				if(currentUser.Users_type == 'chapter'){
					$scope.subNavTabs = [{
						label: "myCampus",
						iconClasses: 'fa fa-rocket',
						url: "#/myCampus"
					}];

					if(currentUser.ChapterUserRoles_name == 'president'){
						if(currentUser.numChapterRequests > 0){
							$scope.subNavTabs.push({
								label: 'Pending Requests',
								url: '#/pending-chapter-requests',
								iconClasses: 'fa fa-rocket',
								html: '<span class="badge badge-indigo">' + currentUser.numChapterRequests + '</span>',
							});
						}
						else{
							$scope.subNavTabs.push({
								label: 'Pending Requests',
								url: '#/pending-chapter-requests',
								iconClasses: 'fa fa-rocket',
							});
						}
						$scope.subNavTabs.push({
							label: 'President Dash',
							url: '#/chapter/admin',
							iconClasses: 'fa fa-rocket'
						});
					}
					
					//if you're in the default chapter and you have a request (pending or not) for an active recruitment
					if(currentUser.isInDefaultChapter && !Utils.isEmpty(currentUser, 'recruitmentUsers')){
						var recruitmentSubSubTabs = [];

						recruitmentSubSubTabs.push(
							{
								iconClasses: 'fa fa-list',
								label: 'Chapter Directory',
								url: '#/myRecruitment/chapter-directory'
							},
							{
								iconClasses: 'fa fa-calendar',
								label: 'Events',
								url: '#/myRecruitment/events'
							},
							{
								iconClasses: 'fa fa-user',
								label: 'Dash',
								url: '#/myRecruitment/dash'
							}
						);
						$scope.subNavTabs.push({
							label: 'myRecruitment',
							iconClasses: 'fa fa-sign-in',
							children: recruitmentSubSubTabs
						});
					}

					//if you're in a real chapter and there is currently an active recruitment for your chapter
					if(!currentUser.isInDefaultChapter && !Utils.isEmpty(currentUser, 'chapterActiveRecruitments')){
						var recruitmentSubSubTabs = [];
						
						recruitmentSubSubTabs.push(
							{
								iconClasses: 'fa fa-list',
								label: 'Interested Rushees',
								url: '#'
							},
							{
								iconClasses: 'fa fa-list',
								label: 'Chapter Directory',
								url: '#/myRecruitment/chapter-directory'
							},
							{
								iconClasses: 'fa fa-calendar',
								label: 'Events',
								url: '#/myRecruitment/events'
							},
							{
								iconClasses: 'fa fa-user',
								label: 'Dash',
								url: '#/myRecruitment/dash'
							}
						);
						$scope.subNavTabs.push({
							label: 'myRecruitment',
							iconClasses: 'fa fa-sign-in',
							children: recruitmentSubSubTabs
						});
					}
				}
				else if(currentUser.Users_type == 'council'){
					$scope.subNavTabs = [
						{
							label: "myCampus",
							iconClasses: 'fa fa-rocket',
							url: "#/myCampus"
						},
						{
							label: "Recruitments",
							iconClasses: 'fa fa-rocket',
							url: "#/recruitments"
						}];
				}
				else if(currentUser.Users_type == 'university'){
					var recruitmentSubSubTabs = [];
					if(!Utils.isEmpty(currentUser.recruitments)){
						currentUser.recruitments.forEach(function(recruitment){
							recruitmentSubSubTabs.push({
								iconClasses: 'fa fa-rocket',
								label: recruitment.Councils_name + ' - ' + $filter('date')(new Date(recruitment.Recruitments_start), 'MM/dd/yyyy'),
								url: '#/recruitment/' + recruitment.Recruitments_id
							});
						});
					}

					$scope.subNavTabs = [{
						label: "Recruitments",
						iconClasses: 'fa fa-rocket',
						children: recruitmentSubSubTabs
					}];
					$scope.subNavTabs.push({
						label: 'Admin Dash',
						url: '#/universities/admin',
						iconClasses: 'fa fa-rocket'
					});
				}
			}
		}
		
		function navReady(){
			setParent($scope.subNavTabs, null);
			buildingSubNav = false;
			highlightNav($location.path());
		}
		
		if(deferreds.length){
			$q.all(deferreds).finally(navReady)
		}else{
			navReady();
		}
	}
	$rootScope.$on('user.set', setSubNavTabs);
	setSubNavTabs();		//not really needed

	//     $scope.menu = [
	//         {
	//             label: 'Dashboard',
	//             iconClasses: 'fa fa-home',
	//             url: '#/'
	//         }
	//     ];

	setParent($scope.publicNavTabs, null);
	setParent($scope.mainNavTabs, null);
	
	function closeOpenNodes(){
		for (var i = $scope.openItems.length - 1; i >= 0; i--) {
			$scope.openItems[i].open = false;
		};
		$scope.openItems = [];
	}

	$scope.$watch(function () {
		return $location.path();
	}, function (newVal, oldVal) {
		if ($scope.selectedFromNavMenu === false) {
			$timeout(function(){
				highlightNav(newVal);
			}, 1);
		}
		$scope.selectedFromNavMenu = false;
		$global.set('leftbarShown', false);
	});
	
	//hacky
	$timeout(function(){
		highlightNav($location.path());
	}, 500)

	// searchbar
	// 	$scope.showSearchBar = function ($e) {
	// 		$e.stopPropagation();
	// 		$global.set('showSearchCollapsed', true);
	// 	}
	// 	$scope.$on('globalStyles:changed:showSearchCollapsed', function (event, newVal) {
	// 		$scope.style_showSearchCollapsed = newVal;
	// 	});
	// 	$scope.goToSearch = function () {
	// 		$location.path('/extras-search')
	// 	};
})
