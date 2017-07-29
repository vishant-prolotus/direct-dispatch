/**
 * Application Request Handler
 * @namespace dd.common
 * @author Faisal Hasnain <faisalhasnain90@gmail.com>
 * @author Junaid Atari <mj.atari@gmail.com>
 * @copyright 2015 Direct-Dispatch.com
 * @type {object|module}
 * @version 1.2
 */

angular

	.module('dd.common', ['ui.app'])

	.factory('restApi', function ($http, apiHost, Spinner) {
		return {

			/**
			 * Send a HTTP GET Request
			 * @param {String} url A string containing the URL to which the request is sent.
			 * @param {Array} options (optional) A set of key/value pairs that configure the Ajax request.
			 * @returns {$http.get}
			 */
			get: function (url, options) {
				debugger;
				//Spinner.show();

				return req = $http.get(apiHost + url, options),
					req.finally(function () {
						Spinner.hide();
					}),
					req;
			},

			/**
			 * Send a HTTP POST Request
			 * @param {String} url A string containing the URL to which the request is sent.
			 * @param {Object} data Data to be sent to the server.
			 * @param {Array} options (optional) A set of key/value pairs that configure the Ajax request.
			 * @returns {$http.post}
			 */
			post: function (url, data, options) {
				//Spinner.show();

				return req = $http.post(apiHost + url, data, options),
					req.finally(function () {
						Spinner.hide();
					}),
					req;
			},

			/**
			 * Send a HTTP PUT Request
			 * @param {String} url A string containing the URL to which the request is sent.
			 * @param {Object} data Data to be sent to the server.
			 * @param {Array} options (optional) A set of key/value pairs that configure the Ajax request.
			 * @returns {$http.put}
			 */
			put: function (url, data, options) {
				//Spinner.show();

				return req = $http.put(apiHost + url, data, options),
					req.finally(function () {
						Spinner.hide();
					}),
					req;
			},

			/**
			 * Send a HTTP DELETE Request
			 * @param {String} url A string containing the URL to which the request is sent.
			 * @param {Array} options (optional) A set of key/value pairs that configure the Ajax request.
			 * @returns {$http.delete}
			 */
			delete: function (url, options) {
				//Spinner.show();

				return req = $http.delete(apiHost + url, options),
					req.finally(function () {
						Spinner.hide();
					}),
					req;
			}
		};
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

	.factory('NowTime', function ($moment) {
		return function (timestamp) {
			return $moment(timestamp).fromNow();
		};
	})

	/**
	 * Realtime Notifications
	 */
	.factory('Notification', function (toasty, $location, $rootScope, $http, NowTime) {
		return function (token, appName) {
			var displayItems = 6;
			var totalCount = 0;
			var totalUnread = 0;

			var theApp = appName || 'staff';

			var notif = this;

			notif.isFetched = false;

			$rootScope.notif = {};

			if (typeof $rootScope.notificationsList === 'undefined') {
				$rootScope.notificationsList = [];
			}

			$rootScope.notif.bindClick = function (n, $event) {
				$event.preventDefault();
				$event.stopPropagation();

				if (typeof notif.clickHandlerList[n.type] !== 'function') {
					return;
				}

				if (!n.read) {
					markRead(n.id);
				}

				notif.clickHandlerList[n.type](n);
			};

			$rootScope.notif.countUnRead = function () {
				//				var v = {};
				//				
				//				 v = _.countBy ($rootScope.notificationsList, function(nty){
				//					
				//					return !nty.read;
				//				});
				//				
				//				if (typeof v !== 'object' || !v.propertyIsEnumerable('true') ||  !v.true)
				//				{
				//					return totalUnread;
				//				}

				return totalUnread;
			};

			$rootScope.notif.getNowTime = function (time) {
				return NowTime(time);
			};

			$rootScope.notif.removeClick = function ($event) {
				$event.preventDefault();
				$event.stopPropagation();
				return false;
			};

			$rootScope.notif.removeThis = function (id, $event) {
				$event.preventDefault();
				$event.stopPropagation();

				var idx = _.findIndex($rootScope.notificationsList, {
					'id': id
				});

				$rootScope.progress = true;

				$http.delete('/api/' + theApp + '/notifications/' + id).success(function () {
					if (!$rootScope.notificationsList[idx].read) {
						totalUnread -= 1;
					}

					$rootScope.progress = false;
					$rootScope.notificationsList.splice(idx, 1);
					totalCount -= 1;
				});
			};

			var markRead = function (id) {
				var idx = _.findIndex($rootScope.notificationsList, {
					'id': id
				});

				$rootScope.progress = true;

				$http.put('/api/' + theApp + '/notifications/' + id + '/read').success(function () {
					$rootScope.progress = false;
					$rootScope.notificationsList[idx].read = true;
					totalUnread -= 1;
				});
			};

			$rootScope.notif.markAsRead = function (id, $event) {
				$event.preventDefault();
				$event.stopPropagation();

				markRead(id);
			};

			$rootScope.notif.getIcon = function (type) {
				if (type === 'new-lead') {
					return 'fa fa-car';
				}

				if (type === 'new-order') {
					return 'fa fa-shopping-cart';
				}

				if (type === 'order-dispatched') {
					return 'fa fa-paper-plane';
				}

                if (type === 'order-canceled') {
					return 'fa fa-ban';
				}

				if (type === 'load-alert') {
					return 'fa fa-bullhorn';
				}

                if (type === 'shipper-fee-authorized') {
					return 'fa fa-usd';
				}

                if (type === 'shipper-fee-released') {
					return 'fa fa-usd';
				}

                if (type === 'carrier-fee-authorized') {
					return 'fa fa-usd';
				}

                if (type === 'carrier-fee-released') {
					return 'fa fa-usd';
				}

                if (type === 'total-fee-authorized') {
					return 'fa fa-usd';
				}

                if (type === 'total-fee-released') {
					return 'fa fa-usd';
				}

                if (type === 'carrier-signup') {
					return 'fa fa-truck';
				}

                if (type === 'carrier-activated') {
					return 'fa fa-truck';
				}

                if (type === 'carrier-profile-completed') {
					return 'fa fa-truck';
				}

                if (type === 'load-alerts-sent') {
					return 'fa fa-check-circle';
				}

                if (type === 'load-alerts-no-results') {
					return 'fa fa-times-circle';
				}

				if (type === 'new-points') {
					return 'fa fa-star-o';
				}

				if (type === 'new-leads-assigned') {
					return 'fa fa-car';
				}

				// dealers related notifications

				if (type === 'dealer-signup') {
					return 'fa fa-truck';
				}

                if (type === 'dealer-activated') {
					return 'fa fa-truck';
				}

				if (type === 'dealer-new-order') {
					return 'fa fa-shopping-cart';
				}

                return 'fa fa-bell';

			};

			notif.handlersList = [];
			notif.clickHandlerList = [];

			if (theApp === 'staff') {
				notif.clickHandlerList['new-lead'] = function (data) {
					$location.path('leads/view/' + data.params.leadId);
				};

				notif.clickHandlerList['new-order'] = function (data) {
					$location.path('orders/view/' + data.params.orderId);
				};

                notif.clickHandlerList['order-dispatched'] = function (data) {
					$location.path('orders/view/' + data.params.orderId);
				};

                notif.clickHandlerList['carrier-signup'] = function (data) {
					$location.path('carriers/view/' + data.params.carrierId);
				};

                notif.clickHandlerList['carrier-activated'] = function (data) {
					$location.path('carriers/view/' + data.params.carrierId);
				};

                notif.clickHandlerList['carrier-profile-completed'] = function (data) {
					$location.path('carriers/view/' + data.params.carrierId);
				};

                notif.clickHandlerList['load-alerts-sent'] = function (data) {
					$location.path('orders/view/' + data.params.orderId);
				};

                notif.clickHandlerList['load-alerts-no-results'] = function (data) {
					$location.path('orders/view/' + data.params.orderId);
				};

				notif.clickHandlerList['new-points'] = function (data) {
					$location.path('bonus');
				};

				notif.clickHandlerList['new-leads-assigned'] = function (data) {
					$location.path('leads');
				};

				// dealers related notifications to staff

				notif.clickHandlerList['dealer-signup'] = function (data) {
					$location.path('dealers/view/' + data.params.dealerId);
				};

                notif.clickHandlerList['dealer-activated'] = function (data) {
					$location.path('dealers/view/' + data.params.dealerId);
				};

				notif.clickHandlerList['dealer-new-order'] = function (data) {
					$location.path('orders/view/' + data.params.orderId);
				};

			}

			if (theApp === 'carrier') {

                notif.clickHandlerList['order-canceled'] = function (data) {
					$location.path('orders/view/' + data.params.orderId);
				};

				notif.clickHandlerList['load-alert'] = function (data) {
					$location.path('loads/search/' + data.params.loadId);
				};

                notif.clickHandlerList['shipper-fee-authorized'] = function (data) {
					$location.path('orders/view/' + data.params.orderId);
				};

                notif.clickHandlerList['shipper-fee-released'] = function (data) {
					$location.path('orders/view/' + data.params.orderId);
				};

                notif.clickHandlerList['carrier-fee-authorized'] = function (data) {
					$location.path('orders/view/' + data.params.orderId);
				};

                notif.clickHandlerList['carrier-fee-released'] = function (data) {
					$location.path('orders/view/' + data.params.orderId);
				};

                notif.clickHandlerList['total-fee-authorized'] = function (data) {
					$location.path('orders/view/' + data.params.orderId);
				};

                notif.clickHandlerList['total-fee-released'] = function (data) {
					$location.path('orders/view/' + data.params.orderId);
				};
			}

			notif.addHandler = function (callback) {
				notif.handlersList.push(callback);
			};

			notif.eventSource = null;

			notif.create = function () {
				$rootScope.progress = true;

				$http.get('/api/' + theApp + '/notifications?limit=' + displayItems).success(function (d) {
					$rootScope.progress = false;

					totalCount = d.total;
					totalUnread = d.unread;

					var items = d.items;

					if (items.length >= displayItems) {
						$rootScope.notificationsList = items.splice(0, displayItems);
						return;
					}

					$rootScope.notificationsList = items;
				});


				if(typeof EventSource!=="undefined"){

					notif.eventSource = new EventSource('/api/' + theApp + '/notifications/subscribe/' + token);
				$rootScope.EventSource = notif.eventSource ;
				notif.eventSource.onmessage = function (evt) {
					var json = JSON.parse(evt.data);
						toasty.success({
							title: 'new leads arrived',
							msg: evt.data
						});
					$rootScope.$apply(function () {
						if ($rootScope.notificationsList.length >= displayItems) {
							$rootScope.notificationsList.splice(displayItems - 1, 1);
						}

						totalUnread += 1;
						$rootScope.notificationsList.unshift(json);

						$rootScope.notificationsNewCount += 1;

						if (!notif.handlersList.length) {
							return;
						}

						notif.handlersList.forEach(function (hnd) {
							hnd.call(this, json.type, json);
						});

					});
				};

				return notif;

				}
				

				
			};

			notif.addHandler(function (type, data) {
				notif.success(data, function () {
					notif.clickHandlerList[type](data);
				});
			});

			var _npops = function (data, callbackClick, callbackAdd, callbackRemove, options) {
				var _props = $.extend((options || {}),
					{
						title: data.title,
						msg: data.contents,
						timeout: 5000,
						showClose: true,
						onClick: function (toasty) {
							$http.put('/api/' + theApp + '/notifications/' + data.id + '/read', {});
							totalUnread -= 1;

							if (typeof callbackClick === 'function') {
								callbackClick.call(this, data);
							}

							toasty.remove();

						},
						onAdd: function (toasty) {
							if (typeof callbackAdd === 'function') {
								callbackAdd.call(this, data);
							}
						},
						onRemove: function (toasty) {
							if (typeof callbackRemove === 'function') {
								callbackRemove.call(this, data);
							}
						}
					});

				return _props;

			};

			notif.success = function (data, callbackClick, callbackAdd, callbackRemove) {
				toasty.success(_npops(data, callbackClick, callbackAdd, callbackRemove));
			};

			notif.warning = function (data, callbackClick, callbackAdd, callbackRemove) {
				toasty.warning(_npops(data, callbackClick, callbackAdd, callbackRemove));
			};

			notif.wait = function (data, callbackClick, callbackAdd, callbackRemove) {
				toasty.wait(_npops(data, callbackClick, callbackAdd, callbackRemove));
			};

			notif.error = function (data, callbackClick, callbackAdd, callbackRemove) {
				toasty.error(_npops(data, callbackClick, callbackAdd, callbackRemove));
			};

			notif.info = function (data, callbackClick, callbackAdd, callbackRemove) {
				toasty.info(_npops(data, callbackClick, callbackAdd, callbackRemove));
			};

			return notif;
		};
	});