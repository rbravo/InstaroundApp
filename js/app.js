var InstaroundApp = angular.module('InstaroundApp', ['ngRoute']);

InstaroundApp.run(['$location', '$rootScope', function($location, $rootScope) {
    $rootScope.$on('$routeChangeSuccess', function (event, current, previous) {
        //$rootScope.title = current.$$route.title;
    	if($rootScope.activateView) $rootScope.activateView(current.$$route);
    });
}]);

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
		.when('/photo/:id',
		{
			controller: 'PhotoController',
			templateUrl: 'views/PhotoView.html'

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
InstaroundApp.controller('MapController', function($scope,$array,$http,$routeParams,$location,debounce,InstagramFactory){
	
	var map,oms,center,userLocation,mymarker,to_refresh,posts;
	init();

	function init(){
		getLocation();
		try{
			navigator.splashscreen.hide();
		} catch(e){console.log(e);}

		$scope.InstagramFactory = InstagramFactory;
		posts = InstagramFactory.posts;
		$scope.getPosts =function(){return posts;};
		$scope.$watch($scope.getPosts,updateMarkers,true);
	};

	function initMap(_lat,_lon){
		if(map != null) return;
		var myOptions = {
		    zoom: 11,
		    center: new google.maps.LatLng(_lat==null?-22.907072809355967:_lat, _lon==null?-43.21398052978515:_lon),
		    mapTypeId: google.maps.MapTypeId.ROADMAP,
		    streetViewControl: false
		};
		map = new google.maps.Map(document.getElementById('map_canvas'), myOptions);
		oms = new OverlappingMarkerSpiderfier(map,{nearbyDistance:44});
		google.maps.event.addListener(map, 'idle', function() {
			if(to_refresh>0) { 
				clearTimeout(to_refresh);
				to_refresh = 0;
				console.log('clearedTO:'+to_refresh);
			}
			to_refresh = setTimeout(function(){
				setCenter();
				console.log('callinRefresh');
			},800);
			console.log('setTO->'+to_refresh);

    	});
    };

    function setCenter(){
    	var center = map.getCenter();
    	lat = center.lat();
    	lon = center.lng();
    	refreshNearby();
    };

    function getLocation(){
		navigator.geolocation.getCurrentPosition(function(position) {
		// Successfully retrieved the geolocation information. Display it all.
        
		/*$scope._setResults('Latitude: ' + position.coords.latitude + '<br />' +
						 'Longitude: ' + position.coords.longitude + '<br />' +
						 'Altitude: ' + position.coords.altitude + '<br />' +
						 'Accuracy: ' + position.coords.accuracy + '<br />' +*/
			lat = position.coords.latitude;
			lon = position.coords.longitude;
			userLocation = new google.maps.LatLng(lat, lon);
			initMap(lat,lon);
			if(mymarker != null) mymarker.setMap(null);
	    	mymarker = new google.maps.Marker({
	                    	position: userLocation,
	                        map: map,
	                        icon: 'images/circle.png'
	                    });
	    	map.setCenter(userLocation);
			refreshNearby(true);
		},function(e){
			alert('error: '+ e.message);
			initMap();
			refreshNearby();
		});
	};
	
	function updateMarkers(newPhotos, oldPhotos) {
        var $newPhotos = $array(newPhotos);
        var $oldPhotos = $array(oldPhotos);

        if ($newPhotos.equalById(oldPhotos)) {
            return;
        }

        $array(newPhotos)
        .concat(oldPhotos)
        .unique()
        .forEach(function (photo) {
            var isOld = $oldPhotos.containsById(photo);
            var isNew = $newPhotos.containsById(photo);

            //se nao tem na old e tem na new
            if (isNew && !isOld) {
                photo.hash = photo.link.split('instagram.com/p/')[1].split('/')[0];
                addPhotoToMap(photo);
                if(oldPhotos.length == 0)
                	map.fitBounds(bounds);
            }

            //se tem na old e nao tem na new
            if (!isNew && isOld) {
                removePhotoFromMap(photo);
            }
        });
    };
    var bounds;
    function addPhotoToMap(photo)
    {
		var pos = new google.maps.LatLng(photo.location.latitude, photo.location.longitude);
		bounds = bounds || new google.maps.LatLngBounds();
		bounds.extend(pos);
    	var pinIcon = new google.maps.MarkerImage(
		    photo.images.thumbnail.url,
		    null, /* size is determined at runtime */
		    null, /* origin is 0,0 */
		    null, /* anchor is bottom center of the scaled image */
		    new google.maps.Size(44, 44)
		);  
		var marker = new google.maps.Marker({
        	position: pos,
            map: map,
            icon: pinIcon
        });
        oms.addMarker(marker);
        marker.hash = photo.hash;
	    oms.addListener('click', debounce(function(marker, event) {
    		//console.log('go2post(marker.content)');
			$location.path('/photo/' + marker.hash);
			$scope.$apply();
		},100,false));
    };

    function removePhotoFromMap(photo)
    {
		oms.removeMarker(photo.marker);
    };

	function refreshNearby(setBounds)
	{
    	var bounds = new google.maps.LatLngBounds();
		// show loading: TODO

		InstagramFactory.getNearby(lat,lon,function(data){
			var $posts = $array(posts);			
			$array(data.data).forEach(function(o){ 
				if(!$posts.contains(o)){ 
					o.id = o.link;
					posts.push(o); }
				}
			);
		});
		
	}
});

// PostController
//
InstaroundApp.controller('PhotoController', function($scope,$routeParams,$location,$rootScope,$route,InstagramFactory){
	
	// This controller is going to set theaters
	// variable for the $scope object in order for view to
	// display its contents on the screen as html 
	$scope.post = {};

	// Just a housekeeping.
	// In the init method we are declaring all the
	// neccesarry settings and assignments
	init();

	function init(){
	}

	$scope.$watch(function() { return $location.path(); }, function(newValue, oldValue){  
	    //if ($scope.loggedIn == false && newValue != '/login'){  
	    //        $location.path('/login');  
	    //}
	    if(newValue.indexOf('/photo')>-1)
	    	$scope.post = InstagramFactory.getPost($location.path().split('/photo/')[1]);  
	});
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
InstaroundApp.factory('InstagramFactory', function($http,$array){
	var posts = [];
	return {
		getNearby: function(lat,lon,cb){
			$http.get('https://api.instagram.com/v1/media/search?lat='+lat+'&lng='+lon+'&client_id=f9a471af537e46a48d14e83f76949f89').success(function(data){
				cb(data);
			});
		}, posts: posts,
		getPost: function (hash) {
			return posts.filter(function(x){ return x.hash == hash})[0];
		}
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

function hashCode(s){
  return s.split("").reduce(function(a,b){a=((a<<5)-a)+b.charCodeAt(0);return a&a},0);              
}
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

InstaroundApp.factory('$array', function () {
    var $array = function (array) {
        array = array || [];

        return {
            value: array,
            concat: function (array2) {
                return $array(array.concat(array2));
            },
            forEach: function (cb) {
                array.forEach(cb);

                return this;
            },
            every: function (cb) {
                return array.every(cb);
            },
            contains: function (v) {
                if (!array) {
                    return false;
                }

                for (var i = 0; i < array.length; i++) {
                    if (array[i] === v) return true;
                }
                return false;
            },
            containsById: function (v) {
                if (!array || !v) {
                    return false;
                }

                return this.mapIds().contains(v.id);
            },
            getById: function(id){
    			return array.filter(function(x){return x.id == id})[0];
            },
            unique: function () {
                var arr = [];

                for (var i = 0; i < array.length; i++) {
                    if (!$array(arr).contains(array[i])) {
                        arr.push(array[i]);
                    }
                }

                return $array(arr);
            },
            mapIds: function () {
                var idArray = array.map(function (ele) {
                    return ele.id;
                });

                return $array(idArray);
            },
            equalById: function (array2) {
                var that = this;

                var ret =
                this
                .mapIds()
                .every(function (a) {
                    return $array(array2).mapIds().contains(a);
                })
                &&
                $array(array2)
                .mapIds()
                .every(function (a) {
                    return that.mapIds().contains(a);
                });

                return ret;
            },
        };
    };

    return $array;
});

// Create an AngularJS service called debounce
InstaroundApp.factory('debounce', function ($timeout, $q) {
    return function (func, wait, immediate) {
        var timeout;
        var deferred = $q.defer();
        return function () {
            var context = this, args = arguments;
            var later = function () {
                timeout = null;
                if (!immediate) {
                    deferred.resolve(func.apply(context, args));
                    deferred = $q.defer();
                }
            };
            var callNow = immediate && !timeout;
            if (timeout) {
                $timeout.cancel(timeout);
            }
            timeout = $timeout(later, wait);
            if (callNow) {
                deferred.resolve(func.apply(context, args));
                deferred = $q.defer();
            }
            return deferred.promise;
        };
    };
});

//usage: debounce(function (a){ alert(a); },1000,false);
