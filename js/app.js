var InstaroundApp = angular.module('InstaroundApp', ['ngRoute']);



////////// ROUTING /////////////////////////

// Defining $routeProvider applicatiom module
//
InstaroundApp.config(function ($routeProvider) {
	$routeProvider
		.when('/',
		{
			controller: 'MapController',
			templateUrl: 'views/MapView.html'
		})
		// theaters list page
		//
		.when('/post/:postId',
		{
			controller: 'TheatersController',
			templateUrl: 'views/TheatersView.html'

		})
		// theaters list page
		//
		.when('/theaters',
		{
			controller: 'TheatersController',
			templateUrl: 'views/TheatersView.html'

		})
		// settings page
		//
		.when('/settings',
		{
			controller: 'SettingsController',
			templateUrl: 'views/SettingsView.html'

		})

		// if non of the above routes
		// are matched we are setting router
		// to redirect to the RootController
		.otherwise({ redirectTo: '/'});

});

// InstaroundApp.config(function ($httpProvider){
//     $httpProvider.defaults.useXDomain = true;
//     delete $httpProvider.defaults.headers.common['X-Requested-With'];
// });


///////// CONTROLERS ////////////////////////////
// Below we are going to define all the controllers
// we have defined in the router
//

// RootController
//
InstaroundApp.controller('MapController', function($scope,$http,$routeParams,InstagramFactory){
	
	init();

	function init(){
		getLocation();
		try{
			navigator.splashscreen.hide();
		} catch(e){console.log(e);}
	};

	function initMap(_lat,_lon){
		if($scope.map != null) return;
		var myOptions = {
		    zoom: 11,
		    center: new google.maps.LatLng(_lat==null?-22.907072809355967:_lat, _lon==null?-43.21398052978515:_lon),
		    mapTypeId: google.maps.MapTypeId.ROADMAP,
		    streetViewControl: false
		};
		$scope.map = new google.maps.Map(document.getElementById('map_canvas'), myOptions);
		$scope.oms = new OverlappingMarkerSpiderfier($scope.map,{nearbyDistance:44});
		$scope.markers = [];
		google.maps.event.addListener($scope.map, 'idle', function() {
			if($scope.to_refresh>0) { 
				clearTimeout($scope.to_refresh);
				$scope.to_refresh = 0;
				console.log('clearedTO:'+$scope.to_refresh);
			}
			$scope.to_refresh = setTimeout(function(){
				setCenter();
				console.log('callinRefresh');
			},800);
			console.log('setTO->'+$scope.to_refresh);

    	});
    };

    function setCenter(){
    	var center = $scope.map.getCenter();
    	$scope.lat = center.lat();
    	$scope.lon = center.lng();
    	refreshNearby();
    };

    function getLocation(){
		navigator.geolocation.getCurrentPosition(function(position) {
		// Successfully retrieved the geolocation information. Display it all.
        
		/*$scope._setResults('Latitude: ' + position.coords.latitude + '<br />' +
						 'Longitude: ' + position.coords.longitude + '<br />' +
						 'Altitude: ' + position.coords.altitude + '<br />' +
						 'Accuracy: ' + position.coords.accuracy + '<br />' +*/
			$scope.lat = position.coords.latitude;
			$scope.lon = position.coords.longitude;
			$scope.userLocation = new google.maps.LatLng($scope.lat, $scope.lon);
			initMap($scope.lat,$scope.lon);
			if($scope.mymarker != null) $scope.mymarker.setMap(null);
	    	$scope.mymarker = new google.maps.Marker({
	                    	position: $scope.userLocation,
	                        map: $scope.map,
	                        icon: 'images/circle.png'
	                    });
	    	$scope.map.setCenter($scope.userLocation);
			refreshNearby(true);
		},function(e){
			alert('error: '+ e.message);
			initMap();
			refreshNearby();
		});
	};
	
	var allMarkers = {};
	var posts = {};
	function refreshNearby(setBounds)
	{
    	var bounds = new google.maps.LatLngBounds();
		// show loading: TODO
		InstagramFactory.getNearby($scope.lat,$scope.lon).success(
			function(resp){
          		//console.log(resp);

          		// tem mto marker ja?
          		if(Object.keys(allMarkers).length>150)
          		{
          			console.log('clean markers');
	          		angular.forEach(that.markers,function(i,o){
						$scope.oms.removeMarker(o);
	      				o.setMap(null);

	          		});
	          		allMarkers = {};
          		}
          		angular.forEach(resp.data,function(o){
                	var pos = new google.maps.LatLng(o.location.latitude, o.location.longitude);
					bounds.extend(pos);
                	if(allMarkers[o.link] != null) return; // -> se ja tiver no client nao faz nada
                	var pinIcon = new google.maps.MarkerImage(
					    o.images.thumbnail.url,
					    null, /* size is determined at runtime */
					    null, /* origin is 0,0 */
					    null, /* anchor is bottom center of the scaled image */
					    new google.maps.Size(44, 44)
					);  
            		var marker = new google.maps.Marker({
                    	position: pos,
                        map: $scope.map,
                        icon: pinIcon
                    });
                    $scope.oms.addMarker(marker);
                    allMarkers[o.link] = marker;
                    posts[o.link] = o;
                    var olink = o.link;

					marker.content = 'TODO';//getPostContent(posts[olink]);
				    $scope.oms.addListener('click', function(marker, event) {
		        		console.log('go2post(marker.content)');
					});

              	});
				if(setBounds)
              		$scope.map.fitBounds(bounds);
    			
    			InstagramFactory.posts = allMarkers;
    			//$('#loadingBtn').hide(); : TODO
      		}
  		);
	}
});

// PostController
//
InstaroundApp.controller('PhotoController', function($scope,$routeParams,InstagramFactory){
	
	// This controller is going to set theaters
	// variable for the $scope object in order for view to
	// display its contents on the screen as html 
	$scope.post = [];

	// Just a housekeeping.
	// In the init method we are declaring all the
	// neccesarry settings and assignments
	init();

	function init(){
		$scope.theaters = theatersFactory.getTheaters();
	}	
});

// TheatersController
//
InstaroundApp.controller('TheatersController', function($scope,$routeParams,InstagramFactory){
	
	// This controller is going to set theaters
	// variable for the $scope object in order for view to
	// display its contents on the screen as html 
	$scope.theaters = [];

	// Just a housekeeping.
	// In the init method we are declaring all the
	// neccesarry settings and assignments
	init();

	function init(){
		$scope.theaters = theatersFactory.getTheaters();
	}	
});

// SettingsController
//
InstaroundApp.controller('SettingsController', function($scope){
	// This controller is going just to serve the view
});


///////////// FACTORIES ////////////////////////////

// Defining recommendedMovies factory
// It has 5 recomended movies and 
// makes them awailable to controller
// so it can pass values to the temmplate
//
InstaroundApp.factory('InstagramFactory', function($http){
	var posts = {};
	return {
		getNearby: function(lat,lon,cb){

			return $http.get('https://api.instagram.com/v1/media/search?lat='+lat+'&lng='+lon+'&client_id=f9a471af537e46a48d14e83f76949f89');
		},
		posts = posts
	}
});

// Defining theatersFactory factory
// In this example it has 5 movie theatres 
// but in real live application you would 
// want it to get this data from the web
// service, based on the the movie selected
// by user
//
InstaroundApp.factory('theatersFactory', function(){
	var theaters = [
		{ name: 'Everyman Walton', address: '85-89 High Street London'},
		{ name: 'Ambassador Cinemas', address: 'Peacocks Centre Woking'},
		{ name: 'ODEON Kingston', address: 'larence Street Kingston Upon Thames'},
		{ name: 'Curzon Richmond', address: '3 Water Lane Richmond'},
		{ name: 'ODEON Studio Richmond', address: '6 Red Lion Street Richmond'}
	];

	var factory = {};
	factory.getTheaters = function(){

		// If performing http communication to receive
		// factory data, the best would be to put http
		// communication code here and return the results
		return theaters;
	}

	return factory;
});


function parseInstagramDate(tdate) {
    var system_date = new Date(tdate);
    var user_date = new Date();
    var diff = Math.floor((user_date - system_date) / 1000);
    if (diff <= 1) {return "just now";}
    if (diff < 20) {return diff + " seconds ago";}
    if (diff < 40) {return "half a minute ago";}
    if (diff < 60) {return "less than a minute ago";}
    if (diff <= 90) {return "one minute ago";}
    if (diff <= 3540) {return Math.round(diff / 60) + " minutes ago";}
    if (diff <= 5400) {return "1 hour ago";}
    if (diff <= 86400) {return Math.round(diff / 3600) + " hours ago";}
    if (diff <= 129600) {return "1 day ago";}
    if (diff < 604800) {return Math.round(diff / 86400) + " days ago";}
    if (diff <= 777600) {return "1 week ago";}
    return "on " + system_date;
}

