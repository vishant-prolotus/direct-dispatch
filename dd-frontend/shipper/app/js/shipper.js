angular.module('dd.shipper', ['ngRoute', 'dd.common', 'ddPricing', 'select2', 'ddCityPicker', 'ddVehiclePicker', 'ddVehicleTypePicker', 'ddCarrierTypePicker', 'ddVehicleConditionPicker', 'ddDeliveryTime', 'datePicker', 'ddDeliveryTime', 'ui.app', 'focusOn', 'angular-momentjs', 'ui.bootstrap'])
	.config(function ($locationProvider, $routeProvider) {
		$locationProvider.html5Mode(true);
		$routeProvider
			.when('/view-quote/:id/:token', {
				templateUrl: 'html/view-quote.html',
				controller: 'view-quote'
			})
			.when('/place-order/:id/:token', {
				templateUrl: 'html/place-order.html',
				controller: 'place-order'
			})
			.when('/view-order/:id/:token/:done?', {
				templateUrl: 'html/view-order.html',
				controller: 'view-order'
			})
			.when('/track-order', {
				templateUrl: 'html/track-order.html',
				controller: 'track-order'
			})
			.otherwise({
				redirectTo: '/instant-quote'
			});
	})
	.factory('routeInfo', function () {
		return function (origin, destination, callback) {
			var directionsService = new google.maps.DirectionsService();
			directionsService.route({ origin: origin, destination: destination, travelMode: google.maps.TravelMode.DRIVING }, function (direction, status) {
				if (status == google.maps.DirectionsStatus.OK) {
					var route = direction.routes[0];
					var distance = Math.round(route.legs[0].distance.value * 0.000621371); // meter to miles
					callback(null, { polylineEncoded: route.overview_polyline, distance: distance });
				} else {
					callback("Failed to execute Goolge API call for generating map path");
				}
			});
		};
	})
	.run(function ($rootScope, ddPricing) {
		$rootScope.ddPricing = ddPricing; // make Pricing Module available everywhere
	})
	.controller('view-quote', function ($rootScope, $scope, $routeParams, $timeout, restApi, ddDeliveryTime, cfg) {
		$rootScope.pageDescription = 'Direct Dispatch offers a range of reliable and cheap transportation quotes and car moving quotes that allow you to ship your vehicles without worrying about any hidden brokerage fee! Click here to get a quote, based on your car make and city of shipment.';
		$scope.cfg = cfg;

		restApi.get('/shipper/view-quote/' + $routeParams.id + '/' + $routeParams.token).success(function (lead) {
			$rootScope.pageTitle = 'Quote #' + lead._id;
			$scope.lead = lead;
			$scope.ploc = lead.origin.city + ', ' + lead.origin.state + ' ' + lead.origin.zip;
			$scope.dloc = lead.destination.city + ', ' + lead.destination.state + ' ' + lead.destination.zip;
			$scope.deliveryTime = ddDeliveryTime(lead.distance);
			// $scope.lead.mapUrl = 'https://maps.googleapis.com/maps/api/staticmap?size=620x200&maptype=roadmap&markers=color:red%7Clabel:O%7C' + encodeURI($scope.ploc)
			// 	+ '&markers=color:red%7Clabel:D%7C' + encodeURI($scope.dloc)
			// 	+ '&path=color:red%7Cweight:3%7Cenc:' + encodeURI(lead.polylineEncoded) + '&key=AIzaSyCfN2a6GaYXyfRiHos7S_4Pv9KnJlYns-A';
			var daysOld = Math.round((new Date() - new Date(lead.calculatedAt)) / (24 * 3600 * 1000));
			if (daysOld >= 7) $scope.expired = true;
		}).error(function (err) {
			$scope.error = err;
		});

		$scope.recalculate = function () {
			$scope.calcError = false;
			$scope.calcProgress = true;
			restApi.post('/shipper/recalculate-quote/' + $scope.lead._id + '/' + $scope.lead.token, $scope.lead).success(function (result) {
				$scope.calcProgress = false;
				$scope.lead.distance = result.distance;
				$scope.deliveryTime = ddDeliveryTime($scope.lead.distance);
				result.prices && result.prices.forEach(function (price, index) {
					$scope.lead.vehicles[index].price = price;
					$scope.lead.vehicles[index].fee = result.fees[index];
				});
				$scope.lead.calculatedAt = new Date();
				$scope.expired = false;
			}).error(function (err) {
				$scope.calcProgress = false;
				$scope.calcError = err;
			});
		};

		$scope.showPickup = function () {
			$scope.editPickup = true;
			$timeout(function () {
				$scope.$broadcast('focusOrigin');
			}, 0);
		};

		$scope.savePickup = function () {
			if (!$scope.origin) return;
			$scope.lead.origin = $scope.origin;
			$scope.editPickup = false;
			$scope.recalculate();
		};

		$scope.showDropoff = function () {
			$scope.editDropoff = true;
			$timeout(function () {
				$scope.$broadcast('focusDest');
			}, 0);
		};

		$scope.saveDropoff = function () {
			if (!$scope.dest) return;
			$scope.lead.destination = $scope.dest;
			$scope.editDropoff = false;
			$scope.recalculate();
		};

		$scope.showCarrierType = function () {
			$scope.editCarrierType = true;
			$timeout(function () {
				$scope.$broadcast('focusCarrierType');
			}, 0);
		};

		$scope.saveCarrierType = function () {
			if (!$scope.carrierType) return;
			$scope.lead.carrierType = $scope.carrierType;
			$scope.editCarrierType = false;
			$scope.recalculate();
		};

		$scope.addVehicle = function () {
			$scope.lead.vehicles.push({ make: $scope.model.make, model: $scope.model.model, type: $scope.type, condition: $scope.condition, price: 0, fee: 0 });
			$scope.showAddVehicle = false;
			$scope.submitted = false;
			$scope.model = $scope.type = $scope.condition = null;
			$scope.recalculate();
		};

		$scope.removeVehicle = function (index) {
			$scope.lead.vehicles.splice(index, 1);
			$scope.recalculate();
		};

	})

	.controller('place-order', function ($rootScope, $scope, $window, $location, $routeParams, ddDeliveryTime, restApi, $filter, focus, $timeout, cfg) {
		$rootScope.pageTitle = 'Place Order Online';
		$rootScope.pageDescription = 'Direct Dispatch offers best prices with direct carriers. You can place order online, no need to make long calls';
		//$scope.showCCForm = true;
		$scope.focus = focus;

		// move page to top
		$timeout(function () {
			$('html, body').animate({
				scrollTop: 0
			}, 'slow', function () {
				$('#shipperName').focus();
			});
		}, 50);

		$scope.showFromAuction = function () {
			focus('focusBuyerNumber');
		};

		if (!cfg.package.exists($routeParams.p)) {
			$scope.quoteError = 'Package attribute not present please go back to quote and select package appropriately';
			return;
		}

		$scope.datePicker = { format: 'yyyy-mm-dd', startDate: new Date(), multidate: 5, multidateSeparator: ", " };

		restApi.get('/shipper/view-quote/' + $routeParams.id + '/' + $routeParams.token).success(function (lead) {

			$rootScope.pageTitle += ' #' + lead._id;

			$scope.order = {

				_id: lead._id,
				polylineEncoded: lead.polylineEncoded,
				distance: lead.distance,
				shipper: {
					email: $filter('lowercase')(lead.email), type: 'Individual', phone: lead.phone
				},
				pickup: {
					addressType: 'Private', contactType: 'Me',
					location: lead.origin
				},
				delivery: {
					addressType: 'Private', contactType: 'Me', location: lead.destination
				},
				shipment: {
					carrierType: lead.carrierType, paymentMethod: 'Cash on Delivery'
				},
				vehicles: lead.vehicles,
				package: $routeParams.p,
				packagePrice: $scope.ddPricing.packagePrices[$routeParams.p]
			};

			$scope.deliveryTime = ddDeliveryTime(lead.distance);

			$('#datepicker').datepicker({ format: 'yyyy-mm-dd', startDate: new Date(), multidate: 5, multidateSeparator: ", ", todayHighlight: true });
			$('#datepicker').on("changeDate", function () {
				$scope.order.pickup.dates = $('#datepicker').datepicker('getFormattedDate');
				$scope.$apply();
			});

		}).error(function (err) {
			$scope.quoteError = err;
		});

		$scope.showCCFormClick = function () {
			$scope.submitted = false;
			$scope.showCCForm = true;
			$timeout(function () {
				$('html, body').animate({
					scrollTop: $('#creditCardContainer').offset().top
				}, 'slow', function () {
					$('#cardNumber').focus();
				});
			}, 75);
		};

		$scope.showOrderForm = function () {
			$scope.submitted = false;
			$scope.showCCForm = false;
			$('#shipperName').focus();
		};

		$scope.saveOrder = function () {
			$scope.progress = true;
			$scope.error = false;
			$scope.order.creditCard.expirationDate = $scope.CCExpMonth + $scope.CCExpYear;
			$scope.order.vehicles[0].year = Number($scope.order.vehicles[0].year);
			restApi.post('/shipper/orders', $scope.order).success(function (order) {
				$scope.progress = false;
				// Google Code for Place Order Conversion Page
				if ($window.google_trackConversion) {
					$window.google_trackConversion({
						google_conversion_id: 934403991,
						google_conversion_language: "en",
						google_conversion_format: "3",
						google_conversion_color: "ffffff",
						google_conversion_label: "hQ6lCNuy_WMQl7_HvQM",
						google_remarketing_only: false,
						google_custom_params: {
							orderId: order._id
						}
					});
				}
				$location.path('view-order/' + order._id + '/' + order.token + '/done');
			}).error(function (err) {
				$scope.progress = false;
				$scope.error = err;
			});
		};
	})

	.controller('view-order', function ($rootScope, $scope, $location, $routeParams, restApi, cfg) {
		$rootScope.pageDescription = 'Direct Dispatch offers best prices with direct carriers';
		$scope.cfg = cfg;

		if ($routeParams.done && $routeParams.done == 'done') {
			$scope.orderComplete = true;
		}

		$scope.showOrder = function () {
			$location.path('view-order/' + $routeParams.id + '/' + $routeParams.token);
		};

		restApi.get('/shipper/orders/' + $routeParams.id + '/' + $routeParams.token).success(function (order) {
			$rootScope.pageTitle = 'Order #' + order._id;
			$scope.order = order;

			$scope.ploc = order.pickup.location.city + ', ' + order.pickup.location.state + ' ' + order.pickup.location.zip;
			$scope.dloc = order.delivery.location.city + ', ' + order.delivery.location.state + ' ' + order.delivery.location.zip;

			// $scope.mapUrl = 'https://maps.googleapis.com/maps/api/staticmap?size=640x300&maptype=roadmap&markers=color:red%7Clabel:O%7C' + encodeURI($scope.ploc) + '&markers=color:red%7Clabel:D%7C' + encodeURI($scope.dloc) +
			// 	'&path=color:red%7Cweight:3%7Cenc:' + encodeURI(order.polylineEncoded) + '&key=AIzaSyCfN2a6GaYXyfRiHos7S_4Pv9KnJlYns-A';

			switch (order.status) {
				case 'Pending':
					$scope.statusClass = "box-warning";
					break;
				case 'Dispatched':
					$scope.statusClass = "box-info";
					break;
				case 'Pickedup':
					$scope.statusClass = "box-info";
					break;
				case 'Delivered':
					$scope.statusClass = "box-success";
					break;
				case 'Canceled':
					$scope.statusClass = "box-danger";
					break;
			}
			var orgCity = $scope.order.pickup.location;
			var orgAdr = orgCity.city + ', ' + orgCity.state + ' ' + orgCity.zip;
			var dstCity = $scope.order.delivery.location;
			var dstAdr = dstCity.city + ', ' + dstCity.state + ' ' + dstCity.zip;

			var gmap = $('#google-map').gMap({
				maptype: 'ROADMAP',
				zoom: 10,
				markers: [
					{
						address: orgAdr,
						html: '<div><h4 style="margin-bottom: 8px; text-align:left"><span style="color:#1a75bb;">Pickup Location</span></h4><p class="nobottommargin">' + $scope.order.pickup.address + '</p></div>',
						icon: {
							image: "/img/map-icon-red.png",
							iconsize: [32, 39],
							iconanchor: [13, 39]
						}
					},
					{
						address: dstAdr,
						html: '<div><h4 style="margin-bottom: 8px; text-align:left"><span style="color:#1a75bb;">Delivery Location</span></h4><p class="nobottommargin">' + $scope.order.delivery.address + '</p></div>',
						icon: {
							image: "/img/map-icon-red.png",
							iconsize: [32, 39],
							iconanchor: [13, 39]
						}
					}
				],
				doubleclickzoom: true,
				controls: {
					panControl: true,
					zoomControl: true,
					mapTypeControl: false,
					scaleControl: false,
					streetViewControl: false,
					overviewMapControl: false
				}
			});
			var map = gmap.data('gMap.reference');

			var pathPoints = google.maps.geometry.encoding.decodePath($scope.order.polylineEncoded);
			var path = new google.maps.Polyline({
				path: pathPoints,
				geodesic: true,
				strokeColor: '#FF0000',
				strokeOpacity: 1.0,
				strokeWeight: 3
			});
			var bounds = new google.maps.LatLngBounds();
			pathPoints.forEach(function (point) {
				bounds.extend(point);
			});
			path.setMap(map);
			map.fitBounds(bounds);
		}).error(function (err) {
			$scope.error = err;
		});
	})

	.controller('track-order', function ($rootScope, $scope, $location, restApi, cfg) {
		$rootScope.pageTitle = 'Track Order';
		$rootScope.pageDescription = 'No need to call, you can track the status of your order anytime online';

		$rootScope.currentNavSec = 'track-order';

		$scope.trackOrder = function () {
			$scope.error = false;
			$scope.progress = true;
			restApi.post('/shipper/order-token', { id: $scope.orderId, email: $scope.orderEmail }).success(function (order) {
				$scope.progress = false;
				$location.path('view-order/' + order._id + '/' + order.token);
			}).error(function (err) {
				$scope.progress = false;
				$scope.error = err;
			});
		};
	});

