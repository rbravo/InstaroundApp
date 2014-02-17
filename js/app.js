var InstaroundApp = angular.module('InstaroundApp', ['ngRoute'])
.directive('photoView', function() {
    return {
        //scope: {},
        templateUrl: 'views/PhotoView.html'
    }
})

////////// ROUTING /////////////////////////

// Defining $routeProvider applicatiom module
//
.config(function ($routeProvider) {
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
		.when('/places',
		{
			controller: 'PlacesController',
			templateUrl: 'views/PlacesView.html'

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

})

// InstaroundApp.config(function ($httpProvider){
//     $httpProvider.defaults.useXDomain = true;
//     delete $httpProvider.defaults.headers.common['X-Requested-With'];
// });


///////// CONTROLERS ////////////////////////////
// Below we are going to define all the controllers
// we have defined in the router
//

// MainController
.controller('MainController', function($page,$http,$routeParams,$location,$scope){
	$scope.page = $page;
})
// MapController
.controller('MapController', function($scope,$array,$page,$http,$routeParams,$location,debounce,InstagramFactory,$timeout){
	$scope.page = $page;
	var map,oms,center,userLocation,mymarker,to_refresh,posts;
	init();

	function init(){
		// seting page layout for MAP
		$page.showHeader = false;
		$scope.showPhotoFromMap = false;

		// init controller with user's location
		getLocation();
		try{
			navigator.splashscreen.hide();
		} catch(e){console.log(e);}

		$scope.InstagramFactory = InstagramFactory;
		posts = InstagramFactory.posts;
		$scope.getPosts =function(){return posts;};
		$scope.$watch($scope.getPosts,updateMarkers,true);
		updateMarkers(posts,[]);
	};

	function initMap(_lat,_lon){
		if(map != null) return;
		var myOptions = {
		    zoom: $page.lastZoom != null ? $page.lastZoom : 11,
		    center: $page.lastCenter != null ? $page.lastCenter : new google.maps.LatLng(_lat==null?-22.907072809355967:_lat, _lon==null?-43.21398052978515:_lon),
		    mapTypeId: google.maps.MapTypeId.ROADMAP,
		    streetViewControl: false
		};
		map = new google.maps.Map(document.getElementById('map_canvas'), myOptions);
		google.maps.event.addListener(map, 'idle', function() {
			$page.lastZoom = map.getZoom();
			$page.lastCenter = map.getCenter();
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

		oms = new OverlappingMarkerSpiderfier(map,{nearbyDistance:44});
		window.oms = oms;
    	oms.addListener('click', function(marker, event) {
    		//console.log('go2post(marker.content)');
    		$page.backButtonVisible = true;
    		$page.backButtonFcn = function(){ 
				$scope.showPhotoFromMap = false;
				$page.showHeader = false;
    			//$location.path = '/'; 
    		};
			//$location.path('/photo/' + marker.hash);
			$scope.post = marker.photo;
			$page.showHeader = true;
			$scope.showPhotoFromMap = true;
			console.log(' clicked photo: '+marker.photo.id + ' hash:' + marker.hash);
			$scope.$apply();
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

		if(map == null) {
			$timeout(function(){updateMarkers(newPhotos,oldPhotos);},400);
			return;
		}

		/*if(oldPhotos && oldPhotos.length > 150) {
		 	$array(oldPhotos).forEach(function(d){ 
		 		removePhotoFromMap(d); 
		 		var d2 = $array(newPhotos).getById(d.id);
		 		newPhotos.splice(newPhotos.indexOf(d2),1); 
		 	});
		 	oldPhotos.length = 0;
		}*/


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
    var markerCount = 0;
    function addPhotoToMap(photo)
    {
    	console.log('markerAdded:'+markerCount++);
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
        marker.photo = photo;

    };

    function removePhotoFromMap(photo)
    {
    	if(photo)
    	{
    		var mk = oms.getMarkers().filter(function(k){ return k.hash == photo.hash })[0];
    		if(mk){
				oms.removeMarker(mk);
				mk.setMap(null);
    		}
    	}
    };

	function refreshNearby(setBounds)
	{
    	var bounds = new google.maps.LatLngBounds();
		// show loading: TODO

		InstagramFactory.getNearby(lat,lon,function(data){
			if(posts.length>150)
			{
				$array(posts).forEach(function(d){ 
			 		removePhotoFromMap(d); 
			 	});
				oms.clearMarkers();
				posts.length=0;
			}
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
InstaroundApp.controller('PhotoController', function($scope,$routeParams,$page,$location,$rootScope,$route,InstagramFactory){
	$scope.page = $page;
	$page.showHeader = true;
	$scope.post = {};

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
InstaroundApp.controller('PlacesController', function($scope,$page,$http,$routeParams,InstagramFactory){
	$scope.page = $page;
	$scope.places = [];
	var lat,lon;

	getLocation();

	function getLocation(){
		navigator.geolocation.getCurrentPosition(function(position) {
		// Successfully retrieved the geolocation information. Display it all.
        
		/*$scope._setResults('Latitude: ' + position.coords.latitude + '<br />' +
						 'Longitude: ' + position.coords.longitude + '<br />' +
						 'Altitude: ' + position.coords.altitude + '<br />' +
						 'Accuracy: ' + position.coords.accuracy + '<br />' +*/
			lat = position.coords.latitude;
			lon = position.coords.longitude;
			$scope.searchNearby('');
		},function(error){
			alert(error);
		});
	}

	$scope.query = '';
	$scope.searchNearby = function()
	{
		InstagramFactory.getPlacesNearby(lat,lon,$scope.query).success(function(data){
			$scope.places = data.response.venues.map(function(x){ 
				return { id: x.id, name: x.name, distance: x.location.distance, hereNow: x.hereNow.count }; 
			});
		});
	}

	$scope.goToPlace = function(place){
		window.open('instagram://location?id='+place.id,'_system');
	};
});

// SettingsController
//
InstaroundApp.controller('SettingsController', function($scope){
	// This controller is going just to serve the view
});


///////////// FACTORIES ////////////////////////////
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
		},
		getPlacesNearby: function(lat,lon,query){
			return $http.get('https://api.foursquare.com/v2/venues/search'
												+'?client_id=RFHDATOVTQ5CUYISMBBAVGF3KHUVUNPIZUXAESUDMI5WMHM3'
												+'&client_secret=5G5FJDMD4ADUHFQUQJXKCXXU2KDHMUTQE5ZY3ILPMQ5AS0IC'
												+'&v=20130815'
												+'&ll='+lat+','+lon
												+'&query=' + query);
		}
	}
});

InstaroundApp.factory('$page', function(){
	var showHeader = false;
	var backButtonVisible = false;
	var backButtonFcn = function(){};

	// mapcontroller variables, for when coming back to this view it look like it never changed
	var lastCenter,lastZoom;

	return this;
});


function getGPS(cb,errorcb){
	navigator.geolocation.getCurrentPosition(function(position) {
	// Successfully retrieved the geolocation information. Display it all.
    
	/*$scope._setResults('Latitude: ' + position.coords.latitude + '<br />' +
					 'Longitude: ' + position.coords.longitude + '<br />' +
					 'Altitude: ' + position.coords.altitude + '<br />' +
					 'Accuracy: ' + position.coords.accuracy + '<br />' +*/
		cb(position.coords.latitude,position.coords.longitude);

	},function(e){
		cb(e);
	});
};


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
