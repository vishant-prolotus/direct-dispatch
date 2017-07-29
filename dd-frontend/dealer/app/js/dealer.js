/**
 * Dealer Appplication Core
 */
angular

	.module('dd.dealer', [
		'ngRoute', 'dd.common', 'ddPricing', 'select2', 'datePicker', 'ui.bootstrap', 'ui.app', 'ddCityPicker', 'ddVehiclePicker', 'ddVehicleTypePicker', 'angularInlineEdit', 'angular-momentjs'
	])

	.config(function ($momentProvider) {
		$momentProvider
			.asyncLoading(false)
			.scriptUrl('//cdnjs.cloudflare.com/ajax/libs/moment.js/2.5.1/moment.min.js');
	})
	.config(function ($locationProvider, $routeProvider, $httpProvider) {
		// authentication token in header
		$httpProvider.interceptors.push('authInterceptor');

		// Set URL mode
		$locationProvider.html5Mode(true);

		// Start URL Routing
		$routeProvider

			// Signup
            .when('/signup', {
                templateUrl: 'html/site/register.html',
                controller: 'signup'
            })

			// Account Acvitation
            .when('/activate/:id/:token', {
                templateUrl: 'html/site/activation.html',
                controller: 'activate-account'
            })

			// Login
			.when('/signin', {
				templateUrl: 'html/site/login.html',
				controller: 'signin'
			})

			// Logout
			.when('/signout',
			{
				template: '',
				controller: function ($rootScope, $location, session) {
					session.del();
					delete $rootScope.loginUser;
					$rootScope.EventSource.close();
					$location.path('signin');
				}
			})

			// Recover/Reset password
			.when('/reset-pass', {
				templateUrl: 'html/site/reset-password.html',
				controller: 'reset-pass'
			})

			// Change password
			.when('/new-pass/:id/:token', {
				templateUrl: 'html/site/change-password.html',
				controller: 'new-pass'
			})

			// Confirm email on change email from account
			.when('/confirm-email/:id/:token', {
                templateUrl: 'html/site/confirm-email.html',
                controller: 'confirm-email'
            })

			// Dashboard
			.when('/dashboard', {
				templateUrl: 'html/dashboard.html',
				controller: 'dashboard'
			})

			// Notifications
			.when('/notifications', {
				templateUrl: 'html/notifications.html',
				controller: 'notifications'
			})

			/*
             * =====================
             *    My Account
             * =====================
             */

			// Credentials section
            .when('/account/credentials', {
                templateUrl: 'html/account/credentials.html',
                controller: 'account-credentials'
            })

            // Change password
            .when('/account/credentials/change-password', {
                templateUrl: 'html/account/change-password.html',
                controller: 'change-password'
            })

            // Change email
            .when('/account/credentials/change-email', {
                templateUrl: 'html/account/change-email.html',
                controller: 'change-email'
            })

			// View Company Details
            .when('/account/company', {
                templateUrl: 'html/account/company/index.html',
                controller: 'account-company'
            })

            // Edit Company Details
            .when('/account/company/edit', {
                templateUrl: 'html/account/company/edit.html',
                controller: 'account-company-edit'
            })

            // Billing settings
            .when('/account/billing/:fromOrder?', {
                templateUrl: 'html/account/billing.html',
                controller: 'account-billing'
            })


			/*
             * =====================
             *  Transport Calculator
             * =====================
             */

			.when('/calculator', {
				templateUrl: 'html/calculator.html',
				controller: 'calculator'
			})

			/*
             * =====================
             *  Orders Section
             * =====================
             */

			// Listing/index page
			.when('/orders',
			{
				templateUrl: 'html/order/listing.html',
				controller: 'orders'
			})

			// Create Order
			.when('/orders/create',
			{
				templateUrl: 'html/order/form.html',
				controller: 'edit-order'
			})

			// Edit order
			.when('/orders/edit/:id/:tab?', {
				templateUrl: 'html/order/form.html',
				controller: 'edit-order'
			})

			// Order - View details
			.when('/orders/view/:id/:tab?', {
				templateUrl: 'html/order/details.html',
				controller: 'view-order'
			})

			// to Dashboard page
			.otherwise({
				redirectTo: '/dashboard'
			});
	})

	// Set a variable
	.value('apiHost', '/api')

	.factory('authInterceptor', function ($injector, $q, $rootScope, $location, session, apiHost) {
		return {
			request: function (config) {
				config.headers = config.headers || {};
				var user = session.get();
				if (config.url.search(apiHost) != -1 && user) {
					config.headers.Authorization = 'Bearer ' + user.token;
				}
				return config;
			},
			responseError: function (response) {
				if (response.status === 401) {
					session.del();
					delete $rootScope.loginUser;
					$location.path('/signin');
				}
				return $q.reject(response);
			}
		};
	})

	.factory('session', function ($window) {
		return {
			get: function () {
				if ($window.sessionStorage.ss) {
					return JSON.parse($window.sessionStorage.ss)
				} else {
					return undefined;
				}
			},
			set: function (val) {
				$window.sessionStorage.ss = JSON.stringify(val);
			},
			del: function () {
				delete $window.sessionStorage.ss;
			}
		};
	})

	.factory('tempData', function () {
		var data;
		return {
			get: function () {
				return data;
			},
			set: function (val) {
				data = val;
			}
		};
	})

	.run(function ($rootScope, $location, session, Notification, ddPricing) {
		$rootScope.$on('$routeChangeStart', function (event, next, current) {
			var toPrivate = ['/signup', '/activate', '/signin', '/reset-pass', '/new-pass', '/confirm-email'].every(function (route) {
				return (next.originalPath && next.originalPath.indexOf(route)) == -1;
			});
			var user = session.get();
			if (toPrivate && !user) {
				event.preventDefault();
				delete $rootScope.loginUser;
				$location.path('/signin');
			}
			else if (!toPrivate && user) {
				event.preventDefault();
				$location.path('/dashboard');
			}
		});
		var user = session.get();
		$rootScope.ddPricing = ddPricing; // make Pricing Module available everywhere

		if (user) {
			$rootScope.loginUser = user.title;

			window.notification = new Notification(user.token, 'dealer');
			window.notification.create();
		}
	})

	.controller('signup', function ($scope, restApi) {
        $scope.register = function () {
            $scope.progress = true;
            $scope.error = false;
            $scope.success = false;
            restApi.post('/dealer/register', $scope.dealer).success(function (data) {
                $scope.progress = false;
                $scope.success = data;
            }).error(function (err) {
                $scope.progress = false;
                $scope.error = err;
            });
        };
    })

	.controller('activate-account', function ($scope, restApi, $routeParams) {
        var id = $routeParams.id;
        var token = $routeParams.token;

        if (!id || !token) {
            $scope.error = "Invalid account activation link";
            return;
        }

        $scope.progress = true;

        restApi.get('/dealer/activate-info/' + id + '/' + token).success(function (dealer) {
			$scope.progress = false;
			$scope.dealer = dealer;
		}).error(function (err) {
			$scope.progress = false;
			$scope.error = err;
		});

        $scope.activate = function () {
            $scope.activationForm.passDontMatch = false;
            $scope.error = false;

            if ($scope.dealer.password != $scope.dealer.password2) {
                $scope.activationForm.passDontMatch = true;
                return;
            }

            $scope.progress = true;

            restApi.post('/dealer/activate', {
				id: id,
				token: token,
				password: $scope.dealer.password
			}).success(function (msg) {
				$scope.progress = false;
				$scope.success = msg;
			}).error(function (err) {
				$scope.progress = false;
				$scope.error = err;
			});
        };
    })

	.controller('signin', function ($rootScope, $scope, $location, session, restApi, Notification) {
		$scope.auth = function () {
			$scope.error = false;
			restApi.post('/dealer/auth', { email: $scope.email, pass: $scope.pass })
				.success(function (user) {
					session.set(user);

					$rootScope.loginUser = user.title;

					window.notification = new Notification(user.token, 'dealer');
					window.notification.create();

					$location.path('/dashboard');

				}).error(function (err) {
					$scope.error = err;
				});
		};
	})

	.controller('reset-pass', function ($scope, restApi) {
		$scope.forgot = function () {
			$scope.error = false;
			$scope.success = false;
			restApi.post('/dealer/reset-pass', { email: $scope.email }).
				success(function (data) {
					$scope.success = true;
				}).error(function (err) {
					$scope.error = err;
				});
		};
	})

	.controller('new-pass', function ($scope, restApi, $routeParams) {
		var id = $routeParams.id;
        var token = $routeParams.token;

        if (!id || !token) {
            $scope.error = "Invalid password reset link";
            return;
        }

        $scope.progress = true;

        restApi.get('/dealer/reset-pass-info/' + id + '/' + token)
            .success(function (dealer) {
                $scope.progress = false;
                $scope.dealer = dealer;
            }).error(function (err) {
                $scope.progress = false;
                $scope.error = err;
            });

        $scope.reset = function () {
            $scope.activationForm.passDontMatch = false;
            $scope.error = false;

            if ($scope.dealer.password != $scope.dealer.password2) {
                $scope.activationForm.passDontMatch = true;
                return;
            }

            $scope.progress = true;

            restApi.post('/dealer/new-pass', {
				id: id,
				token: token,
				password: $scope.dealer.password
			}).success(function (msg) {
				$scope.progress = false;
				$scope.success = msg;
			}).error(function (err) {
				$scope.progress = false;
				$scope.error = err;
			});
        };
	})

	.controller('confirm-email', function ($scope, restApi, $routeParams) {
        var id = $routeParams.id;
        var token = $routeParams.token;
        if (!id || !token) {
            $scope.error = "Invalid email confirmation link";
            return;
        }
        $scope.progress = true;
        restApi.post('/dealer/confirm-email', {
			id: id,
			token: token
		}).success(function (msg) {
			$scope.progress = false;
			$scope.success = msg;
		}).error(function (err) {
			$scope.progress = false;
			$scope.error = err;
		});
    })

	.controller('dashboard', function ($rootScope, $scope, restApi, $filter) {
		$rootScope.currentNavSec = 'dashboard';
		// orders
		restApi.get('/dealer/dashboard/orders').success(function (orders) {
			$scope.orders = orders;
			if (orders.total == 0) $('#ordersChartContainer').hide();
			var ctx = document.getElementById("ordersChart");
			var data = {
				labels: ["Pending", "Dispatched", "Pickedup", "Delivered", "Canceled"],
				datasets: [
					{
						data: [orders.pending, orders.dispatched, orders.pickedup, orders.delivered, orders.canceled],
						backgroundColor: ["#F7464A", "#FDB45C", "#46BFBD", "#7AC754", "#7B8B9B"]
					}]
			};
			var picChart = new Chart(ctx, {
				type: 'pie',
				data: data,
				options: Chart.defaults.pie
			});
		});
	})

	// filter for filtering the 
	// pagination result

	// .filter('paginatn', function(){
    // return function(items, start){
	// 	var returningdata =[];
	// 	if(start.limit>=items.length)
	// 	{
	// 		return items;
	// 	}
	// 		for(var i=start.start*start.limit;i<(start.start+1)*start.limit;i++)
	// 		{
	// 			if(items[i]==null)
	// 			{
	// 				return returningdata;
	// 			}
	// 			returningdata.push(items[i]);
	// 		}
	// 		return returningdata;
	// 	};
	// })


	.controller('notifications', function ($rootScope, $scope, restApi, $filter, $http, PaginationEx) {
		$scope.notifications = [];
		$rootScope.progress = true;
		// $scope.currentpage =0;
		// $scope.limitPage = 25;
		// $scope.nextPage = function(){
		// 	if($scope.currentpage<=Math.round(($scope.leads.length)/$scope.limitPage)-1)
		// 	{
		// 		if(typeof $scope.notifications[($scope.currentpage+1)*$scope.limitPage]==='undefined')
        //         {
        //             return;
        //         }
		// 		$scope.currentpage = $scope.currentpage+1;
		// 	}
		// 	console.log($scope.currentpage);
		// }
		// $scope.previousPage =function(){
		// 	if($scope.currentpage==0)
		// 	{
		// 		return;
		// 	}else{
		// 		$scope.currentpage = $scope.currentpage-1;
		// 	}
		// 	console.log($scope.currentpage);
		// }
		$scope.pagination = new PaginationEx(null);

		$scope.pagination.onChange(function (p) {
			p.sortOrder = null;
			restApi.get('/dealer/notifications', { params: p.getParams() }).success(function (data) {
				//var items = data.items;

				p.setTotal(data.total);
				p.loading = false;

				$scope.notifications = data.items;

				$rootScope.progress = false;
			});
		});

		$scope.pagination.start();

		$scope.removeThis = function (id, $event) {
			var idx = _.findIndex($scope.notifications, {
				'id': id
			});
			var idxt = _.findIndex($rootScope.notificationsList, {
				'id': id
			});

			$rootScope.progress = true;

			restApi.delete('/dealer/notifications/' + id).success(function () {
				$rootScope.progress = false;
				$scope.notifications.splice(idx, 1);
				$rootScope.notificationsList.splice(idxt, 1);
				$scope.pagination.total -= 1;
			});
		};

		$scope.markAsRead = function (id, $event) {
			var idx = _.findIndex($scope.notifications, {
				'id': id
			});

			var idxt = _.findIndex($rootScope.notificationsList, {
				'id': id
			});

			$rootScope.progress = true;

			$http.put('/api/dealer/notifications/' + id + '/read').success(function () {
				$rootScope.progress = false;
				$scope.notifications[idx].read = true;
				$rootScope.notificationsList[idxt].read = true;
			});
		};
	})

	.controller('account-credentials', function ($rootScope, $scope, session, restApi, apiHost) {
        $rootScope.currentNavSec = 'account';

        restApi.get('/dealer/user').success(function (dealer) {
			$scope.dealer = dealer;
		});
    })

    .controller('change-email', function ($rootScope, $scope, restApi) {
        $rootScope.currentNavSec = 'account';

        $scope.change = function () {
            $scope.error = false;
            $scope.progress = true;

            restApi.post('/dealer/change-email/', $scope.email).success(function (msg) {
				$scope.progress = false;
				$scope.success = msg;
			}).error(function (err) {
				$scope.progress = false;
				$scope.error = err;
			});
        };
    })

    /**
     * @namespace account
     * @controller Change Password
     */
    .controller('change-password', function ($rootScope, $scope, $location, restApi) {
        $rootScope.currentNavSec = 'account';

        $scope.change = function () {
            if ($scope.password.new !== $scope.password.new2) {
                return $scope.error = "New Password and Confirm Password doesn't match";
            }

            $scope.error = false;
            $scope.progress = true;

            restApi.post('/dealer/change-password/', $scope.password).success(function (msg) {
				$scope.progress = false;
				$scope.success = msg;
			}).error(function (err) {
				$scope.progress = false;
				$scope.error = err;
			});
        };
    })

    /**
     * @namespace account/company
     * @controller Company
     */
    .controller('account-company', function ($rootScope, $scope, session, restApi, apiHost) {
        $rootScope.currentNavSec = 'account';

        restApi.get('/dealer/company')
            .success(function (dealer) {
                $scope.dealer = dealer;
            });
    })

    /**
     * @namespace account/company
     * @controller Edit company details
     */
    .controller('account-company-edit', function ($rootScope, $scope, $location, session, restApi) {

        $rootScope.currentNavSec = 'account';

        restApi.get('/dealer/company').success(function (dealer) {
			$scope.dealer = dealer;
		});

        $scope.save = function () {
            $scope.progress = true;
            $scope.error = false;
            restApi.put('/dealer/company', $scope.dealer).success(function (res) {
				$scope.progress = false;
				$location.path('account/company');
			}).error(function (err) {
				$scope.progress = false;
				$scope.error = err;
			});
        };
    })

	.controller('account-billing', function ($rootScope, $scope, $location, $routeParams, session, restApi, apiHost) {
        $rootScope.currentNavSec = 'account';
        $scope.progress = true;
        restApi.get('/dealer/creditcard').success(function (creditCard) {
            $scope.progress = false;
            $scope.currentCreditCard = creditCard;
            $scope.showCCForm = !creditCard;
        }).error(function (err) {
            $scope.progress = false;
            $scope.error = err;
        });

        $scope.save = function () {
            $scope.progress = true;
            $scope.success = false;
            $scope.error = false;
            restApi.put('/dealer/creditcard', $scope.creditCard).success(function (creditCard) {
                $scope.progress = false;
                $scope.success = 1;
                $scope.showCCForm = false;
                $scope.currentCreditCard = creditCard;
                if ($routeParams.fromOrder) $location.path('orders/create');
            }).error(function (err) {
                $scope.progress = false;
                $scope.error = err;
            });
        };
    })

	.controller('calculator', function ($rootScope, $scope, $location, $routeParams, restApi, Package, tempData) {
		$rootScope.currentNavSec = 'calculator';

		$scope.lead = {
			carrierType: "Open",
			vehicles: [{
				condition: 'Running'
			}]
		};

		$scope.updateDistance = function () {
			if (!$scope.lead.origin || !$scope.lead.destination) return;
			$scope.progress = true;
			$scope.error = false;
			restApi.post('/dealer/route-info', { origin: $scope.lead.origin, destination: $scope.lead.destination }).success(function (route) {
				$scope.progress = false;
				$scope.lead.distance = route.distance;
				$scope.lead.polylineEncoded = route.polylineEncoded;
				$scope.updatePrice();
			}).error(function (err) {
				$scope.progress = false;
				$scope.error = err;
			});
		};

		$scope.updatePrice = function () {
			if (['origin', 'destination', 'distance', 'carrierType'].some(function (prop) { return !$scope.lead[prop]; })) return;
			if ($scope.lead.vehicles.some(function (vehicle) { return !vehicle.type || !vehicle.condition; })) return;
			$scope.progress = true;
			$scope.error = false;
			var request = {
				origin: $scope.lead.origin,
				destination: $scope.lead.destination,
				carrierType: $scope.lead.carrierType,
				distance: $scope.lead.distance,
				vehicles: $scope.lead.vehicles.map(function (vehicle) { return { type: vehicle.type, condition: vehicle.condition }; })
			};
			restApi.post('/dealer/shipping-price', request).success(function (res) {
				$scope.progress = false;
				$scope.lead.vehicles.forEach(function (vehicle, index) {
					vehicle.price = res.prices[index];
					vehicle.fee = res.fees[index];
				});
				$scope.setTotal();
			}).error(function (err) {
				$scope.progress = false;
				$scope.error = err;
			});
		};

		$scope.setTotal = function () {
			$scope.price = $scope.ddPricing.getTotalPrice($scope.lead.vehicles);
		};

		$scope.addVehicle = function () {
			$scope.lead.vehicles.push({
				condition: 'Running'
			});
		};

		$scope.removeVehicle = function (index) {
			$scope.lead.vehicles.splice(index, 1);
			$scope.updatePrice();
		};

		$scope.convert = function () {
			Package('Standard', {
				onOK: function (pkg) {
					$scope.lead.package = pkg;
					tempData.set($scope.lead);
					$location.path('orders/create');
				}
			});
		};

	})
	/**
	 * @namespace orders
	 * @controller listing
	 * @template order/listing.html
	 */
	.controller('orders', function ($rootScope, $scope, $location, restApi, PaginationEx, Confirm, Notify, iDate, $moment, cfg) {
		$scope.iDate = iDate;
		$scope.cfg = cfg;

		$rootScope.currentNavSec = 'orders';

		$scope.progress = true;

		const queryParams = Object.keys($location.search()).length === 0 ? { sortBy: "created", sortOrder: -1, limit: 25, searchBy: "_id" } : $location.search();

		$scope.pagination = new PaginationEx(queryParams.limit, queryParams.searchBy, queryParams.sortBy, queryParams.sortOrder);

		$scope.pagination.onChange(function (p) {
			//console.log($scope.pagination);
			//$location.search(p.getParams());
			restApi.get('/dealer/orders', { params: p.getParams() }).success(function (data) {

				var orders = data.items;

				p.setTotal(data.total);
				p.loading = false;

				orders.forEach(function (order) {
					order.fromNow = $moment(order.created).fromNow();
					order.vehiclesDesc = order.vehicles.reduce(function (pv, cv) {
						return pv + ', ' + cv.model;
					}, '').substr(1);

					if (typeof order.package === 'undefined') {
						order.package = cfg.package.default;
						order.packagePrice = $scope.ddPricing.packagePrices['Standard'];
					}
				});

				$scope.orders = orders;
				$scope.progress = false;
			});
		});

		$scope.pagination.start();

		$scope.onDelete = function (_id) {
			Confirm('Do you want to delete this Order # ' + _id + '?', 'Confirm Delete', {
				onOK: function () {
					$scope.error = false;
					$scope.progress = true;
					restApi.delete('/dealer/orders/' + _id).success(function (msg) {
						$scope.progress = false;

						var idx = _.findIndex($scope.orders, {
							'_id': _id
						});

						$scope.orders.splice(idx, 1);
						Notify.notice('Order #' + _id + ' deleted.');
					})
						.error(function (err) {
							$scope.progress = false;
							$scope.error = err;
							Notify.error('Unable to delete Order #' + _id);
						});
				}
			});
		};
	})

	/**
	 * @namespace orders
	 * @controller edit-order
	 * @template order/form.html
	 */
	.controller('edit-order', function ($rootScope, $scope, $location, $routeParams, restApi, routeInfo, Package, cfg, tempData) {

		$scope.cfg = cfg;

		$scope.changePackage = function () {
			Package($scope.order.package, {
				onOK: function (pkg) {
					$scope.order.package = pkg;
					$scope.order.packagePrice = $scope.ddPricing.packagePrices[pkg];
					$scope.setTotal();
				}
			});
		};

		$rootScope.currentNavSec = 'orders';

		$scope.datePicker = { format: 'yyyy-mm-dd', multidate: 5, multidateSeparator: ', ' };

		$scope.updateDistance = function () {
			if (!$scope.order.pickup.location || !$scope.order.delivery.location) return;
			$scope.progress = true;
			$scope.error = false;
			restApi.post('/dealer/route-info', { origin: $scope.order.pickup.location, destination: $scope.order.delivery.location }).success(function (route) {
				$scope.progress = false;
				$scope.order.distance = route.distance;
				$scope.order.polylineEncoded = route.polylineEncoded;
				$scope.updatePrice();
			}).error(function (err) {
				$scope.progress = false;
				$scope.error = err;
			});
		};

		$scope.updatePrice = function () {
			if (!$scope.order.pickup.location || !$scope.order.delivery.location || !$scope.order.shipment.carrierType || !$scope.order.distance ) return;
			if ($scope.order.vehicles.some(function (vehicle) { return !vehicle.type || !vehicle.condition; })) return;
			$scope.progress = true;
			$scope.error = false;
			var request = {
				origin: $scope.order.pickup.location,
				destination: $scope.order.delivery.location,
				carrierType: $scope.order.shipment.carrierType,
				distance: $scope.order.distance,
				vehicles: $scope.order.vehicles.map(function (vehicle) { return { type: vehicle.type, condition: vehicle.condition }; })
			};
			restApi.post('/dealer/shipping-price', request).success(function (res) {
				$scope.progress = false;
				$scope.order.vehicles.forEach(function (vehicle, index) {
					vehicle.price = res.prices[index];
					vehicle.fee = res.fees[index];
				});
				$scope.setTotal();
			}).error(function (err) {
				$scope.progress = false;
				$scope.error = err;
			});
		};

		$scope.setTotal = function () {
			$scope.price = $scope.ddPricing.getTotalPrice($scope.order.vehicles, $scope.order.packagePrice);
		};

		$scope.addVehicle = function () {
			$scope.order.vehicles.push({ condition: 'Running' });
		};

		$scope.removeVehicle = function (index) {
			$scope.order.vehicles.splice(index, 1);
			$scope.setTotal();
		};

		if ($location.path().indexOf('orders/create') != -1) {
			$scope.datePicker.startDate = new Date();
			$scope.submitButtonLabel = 'Place Order';
			// restApi.get('/dealer/creditcard').success(function (cc) {
			// 	if (!cc) {
			// 		$location.path('account/billing/true');
			// 		return;
			// 	}
				var lead = tempData.get();
				var fromConvert;
				if (lead) {
					fromConvert = true;
				}
				if (!lead) lead = {};
				$scope.cancelState = 'orders';
				$scope.mode = 'create';
				$scope.title = 'Create New Order';
				$scope.order = {
					_id: lead._id,
					polylineEncoded: lead.polylineEncoded,
					distance: lead.distance,
					shipperFeePerc: lead.shipperFeePerc || 5,
					shipper: { type: 'Individual' },
					pickup: { addressType: 'Private', contactType: 'Me', location: lead.origin },
					delivery: { addressType: 'Private', contactType: 'Me', location: lead.destination },
					shipment: { carrierType: lead.carrierType || 'Open', paymentMethod: 'Cash on Delivery' },
					vehicles: lead.vehicles || [{ condition: 'Running' }],
					package: lead.package || cfg.package.default,
					packagePrice: $scope.ddPricing.packagePrices[lead.package || cfg.package.default]
				};
				if (fromConvert) {
					tempData.set(null);
					$scope.setTotal();
				}

				$scope.saveOrder = function () {
					// fix glitch because vehicle make/model picker bound to .model property
					var order = jQuery.extend(true, {}, $scope.order);
					order.vehicles.forEach(function (vehicle) {
						vehicle.make = vehicle.model.make;
						vehicle.model = vehicle.model.model;
					});
					$scope.progress = true;
					$scope.error = false;
					restApi.post('/dealer/orders', order).success(function (res) {
						$scope.progress = false;
						$location.path('orders/view/' + res._id);
					}).error(function (err) {
						$scope.progress = false;
						$scope.error = err;
					});
				};
			// });
		} else if ($location.path().indexOf('orders/edit') != -1) {
			$scope.mode = 'edit';
			$scope.submitButtonLabel = 'Save';
			$scope.cancelState = 'orders/view/' + $routeParams.id;
			restApi.get('/dealer/orders/' + $routeParams.id).success(function (order) {
				$scope.title = 'Edit Order # ' + order._id;
				if (typeof order.package === 'undefined') {
					order.package = cfg.package.default;
					order.packagePrice = $scope.ddPricing.packagePrices['Standard'];
				}

				// fix for glitch in vehicle property
				order.vehicles.forEach(function (vehicle) {
					vehicle.model = { make: vehicle.make, model: vehicle.model };
				});

				$scope.order = order;
				$scope.setTotal();
			});

			$scope.saveOrder = function () {
				// fix glitch because vehicle make/model picker bound to .model property
				var order = jQuery.extend(true, {}, $scope.order);
				order.vehicles.forEach(function (vehicle) {
					vehicle.make = vehicle.model.make;
					vehicle.model = vehicle.model.model;
				});
				$scope.progress = true;
				$scope.error = false;
				restApi.put('/dealer/orders/' + $routeParams.id, order).success(function (res) {
					$scope.progress = false;
					$location.path('orders/view/' + $routeParams.id);
				}).error(function (err) {
					$scope.progress = false;
					$scope.error = err;
				});
			};
		}
	})

	/**
	 * @namespace orders
	 * @controller view-order
	 * @template order/details.html
	 */
	.controller('view-order', function ($rootScope, $scope, $location, $routeParams, $filter, restApi, Confirm, Notify, $timeout, cfg) {
		$rootScope.currentNavSec = 'orders';

		$scope.cfg = cfg;

		$scope.currentPage = 'details';
		$scope.save =function(){
		 var scrollPosition = {
			 position:$(window).scrollTop(),
			 limit:$scope._parm.limit
		 };
      	localStorage.setItem("scrollPosition",JSON.stringify( scrollPosition));
	    }

		if(localStorage.getItem("scrollPosition"))
		{
			debugger
			var abc =JSON.parse(localStorage.getItem("scrollPosition"));
			$scope.pagination.limit=abc.limit;
			$scope._parm.limit = abc.limit;
		setTimeout(function() {
			$('html,body').scrollTop(abc.position,0);
			localStorage.clear();
			// localStorage.setItem("scrollPosition",undefined);
		}, 2000);	
			//window.scrollTo(abc.position,0);
			
		}

		var updateStatus = function () {
			switch ($scope.order.status) {
				case 'Pending':
					$scope.statusClass = "alert-warning";
					break;
				case 'Dispatched':
					$scope.statusClass = "alert-info";
					break;
				case 'Pickedup':
					$scope.statusClass = "alert-info";
					break;
				case 'Delivered':
					$scope.statusClass = "alert-success";
					break;
				case 'Canceled':
					$scope.statusClass = "alert-danger";
					break;
			}
		};

		restApi.get('/dealer/orders/' + $routeParams.id).success(function (order) {
			$scope.hasAuction = order.pickup.fromAuction;

			if (typeof order.package === 'undefined') {
				order.package = 'Standard';
				order.packagePrice = $scope.ddPricing.packagePrices['Standard'];
			}

			$scope.ploc = order.pickup.location.city + ', ' + order.pickup.location.state + ' ' + order.pickup.location.zip;
			$scope.dloc = order.delivery.location.city + ', ' + order.delivery.location.state + ' ' + order.delivery.location.zip;

			order.mapUrl = 'https://maps.googleapis.com/maps/api/staticmap?size=650x250&maptype=roadmap&markers=color:red%7Clabel:O%7C' + encodeURI($scope.ploc) + '&markers=color:red%7Clabel:D%7C' + encodeURI($scope.dloc) +
				'&path=color:red%7Cweight:3%7Cenc:' + encodeURI(order.polylineEncoded) + '&key=AIzaSyCfN2a6GaYXyfRiHos7S_4Pv9KnJlYns-A';
			$scope.order = order;

			if (order.status == 'Dispatched') $scope.pickupDatePassed = new Date() >= new Date(order.carrier.pickupDate);

			updateStatus();
		});

		$scope.emailSubmitted = function (event) {
			event.preventDefault();
			$scope.error = false;
			$scope.success = false;
			$scope.progress = true;
			restApi.get('/dealer/orders/' + $scope.order._id + '/email/submitted').success(function (msg) {
				$scope.progress = false;
				$scope.success = msg;
			}).error(function (err) {
				$scope.progress = false;
				$scope.error = err;
			});
		};

		$scope.cancelOrder = function () {
			Confirm('Do you want to cancel the Order #' + $scope.order._id + ' by shipper side?', 'Cancel Order', {
				onOK: function () {
					$scope.progress = true;
					$scope.error = false;
					restApi.put('/dealer/orders/' + $scope.order._id + '/cancel').success(function (res) {
						$scope.progress = false;
						$scope.order.status = 'Canceled';
						Notify.notice('Order #' + $scope.order._id + ' cancelled.');
						updateStatus();
					}).error(function (err) {
						Notify.error('Unable to cancel Order #' + $scope.order._id);
						$scope.progress = false;
						$scope.error = err;
					});
				}
			});
		};

		$scope.deleteOrder = function () {
			Confirm('Do you want to delete the Order #' + $scope.order._id + ' ?', 'Confirm Delete', {
				onOK: function () {
					var _id = $scope.order._id;

					$scope.error = false;
					$scope.progress = true;
					restApi.delete('/dealer/orders/' + _id).success(function (msg) {
						Notify.notice('Order #' + _id + ' deleted.');
						$scope.progress = false;
						$location.path('orders');

					}).error(function (err) {

						Notify.error('Unable to delete Order #' + _id);
						$scope.progress = false;
						$scope.error = err;
					});
				}
			});
		};

		$scope.notes = [];

		$scope.noteSaved = false;

		function updateNotes() {
			$scope.error = false;
			$scope.progress = true;
			restApi
				.put('/dealer/orders/' + $scope.order._id, { notes: $scope.order.notes })
				.success(function (msg) {
					$scope.progress = false;
					$scope.noteSaved = true;

					$timeout(function () {
						$scope.saveNoteIndex = null;
					}, 1000);
				})
				.error(function (err) {
					$scope.progress = false;
					$scope.error = 'Could not update notes on server';
				});
		}

		$scope.noteIndex = null;
		$scope.delNoteIndex = null;

		$scope.addNote = function () {
			if (!$.trim($scope.noteText)) {
				angular.element('#noteText').focus();
				Notify.notice('Please enter Notes');
				return;
			}

			$scope.order.notes = $scope.order.notes || [];
			$scope.order.notes.push({ contents: $scope.noteText, created: new Date().toISOString() });
			$scope.noteText = '';
			$scope.noteIndex = 0;

			$timeout(function () {
				$scope.noteIndex = null;
			}, 1000);

			updateNotes();
		};

		$scope.deleteNote = function (note, index) {
			$scope.delNoteIndex = index;

			$timeout(function () {
				$scope.order.notes.splice($scope.order.notes.indexOf(note), 1);
				$scope.delNoteIndex = null;
				$scope.delete = false;
				updateNotes();
			}, 1000);
		};

		$scope.showDetails = function (event) {
			event.preventDefault();
			$scope.currentPage = 'details';
		};

		$scope.showNotes = function (event) {
			event.preventDefault();
			$scope.currentPage = 'notes';
		};

		$scope.showPayments = function (event) {
			event.preventDefault();
			$scope.currentPage = 'payments';
		};

		$scope.validateNote = function (newValue, ind) {
			$scope.saveNoteIndex = null;
			if (!$.trim(newValue)) {

				$timeout(function () {
					$scope.saveNoteIndex = null;
				}, 500);

				$scope.saveNoteIndex = ind;
				Notify.notice('Note cannot be empty');
				return false;
			}

			return true;
		};

		$scope.saveNoteIndex = null;
		$scope.saveUpdateNote = function (newValue, note, ind) {


			var index = $scope.order.notes.indexOf(note);

			$scope.order.notes[index].contents = newValue;
			$scope.saveNoteIndex = ind;
			updateNotes();
		};

	});
