angular

    /**
     * @define Carrier Module
     */
    .module('dd.carrier', [
        // Include modules
        'ngRoute', 'dd.common', 'select2', 'datePicker', 'ddPricing', 'ddCityPicker', 'ddRegionPicker', 'ddStatePicker'
        , 'ui.bootstrap', 'ui.app', 'angular-momentjs', 'localytics.directives', 'MobileDetect'
    ])

    // Module Configuration
    .config(function ($locationProvider, $routeProvider, $httpProvider) {
        // authentication token in header
        $httpProvider.interceptors.push('authInterceptor');

        // URL Routing
        $locationProvider.html5Mode(true);

        $routeProvider

            /*
             * =====================
             *      Main Site
             * =====================
             */

            // User Sign in
            .when('/signin', {
                templateUrl: 'html/site/login.html',
                controller: 'signin'
            })

            // Carrier Main Account Signup
            .when('/signup', {
                templateUrl: 'html/site/register.html',
                controller: 'signup'
            })

            // Account Acvitation
            .when('/activate/:id/:token', {
                templateUrl: 'html/site/activation.html',
                controller: 'activate-account'
            })

            // Sub Account Inivation
            .when('/user-invitation/:id/:token', {
                templateUrl: 'html/site/user-invitation.html',
                controller: 'user-invitation'
            })

            // Recover the account's password
            .when('/reset-pass', {
                templateUrl: 'html/site/recover-password.html',
                controller: 'reset-pass'
            })

            // email change confirmation from my account
            .when('/confirm-email/:id/:token', {
                templateUrl: 'html/site/confirm-email.html',
                controller: 'confirm-email'
            })

            .when('/new-pass/:id/:token', {
                templateUrl: 'html/site/new-password.html',
                controller: 'new-pass'
            })

            // Sign out
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

            /* 
             * =====================
             *      Setup Area
             * =====================
             */

            // Starting Wizard
            .when('/setup/start', {
                templateUrl: 'html/setup/start.html',
                controller: 'setup-start'
            })

            // Trucks list
            .when('/setup/truck', {
                templateUrl: 'html/setup/truck.html',
                controller: 'setup-truck'
            })

            // Personal Docs (Insurance, MC, DOT, etc...)
            .when('/setup/docs', {
                templateUrl: 'html/setup/docs.html',
                controller: 'setup-docs'
            })

            // User Notification
            .when('/setup/notifications', {
                templateUrl: 'html/setup/notifications.html',
                controller: 'setup-notifications'
            })

            // Wizard completed
            .when('/setup/done', {
                templateUrl: 'html/setup/done.html',
                controller: 'setup-done'
            })

            /*
             * =====================
             *    My Account Area
             * =====================
             */



            // Dashboard
            .when('/notifications', {
                templateUrl: 'html/notifications.html',
                controller: 'notifications'
            })

            // Main Dashboard
            .when('/dashboard', {
                templateUrl: 'html/dashboard.html',
                controller: 'dashboard'
            })

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

            // Billing settings
            .when('/account/billing/:fromLoad?', {
                templateUrl: 'html/account/billing.html',
                controller: 'account-billing'
            })

            // Documents Page
            .when('/account/docs', {
                templateUrl: 'html/account/docs.html',
                controller: 'account-docs'
            })

            /*
             * =====================
             *    Compnay Section
             * =====================
             */

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

            /*
             * =====================
             *    Truck Section
             * =====================
             */

            // Trucks listing
            .when('/account/trucks', {
                templateUrl: 'html/account/trucks/index.html',
                controller: 'account-trucks'
            })

            // Add a truck
            .when('/account/trucks/add', {
                templateUrl: 'html/account/trucks/form.html',
                controller: 'account-trucks-add'
            })

            // Edit truck details
            .when('/account/trucks/:id/edit', {
                templateUrl: 'html/account/trucks/form.html',
                controller: 'account-trucks-edit'
            })

            /*
             * =====================
             *    User Section
             * =====================
             */

            // User listing
            .when('/account/users', {
                templateUrl: 'html/account/users/index.html',
                controller: 'account-users'
            })

            // Add a user
            .when('/account/users/add', {
                templateUrl: 'html/account/users/form.html',
                controller: 'account-users-add'
            })

            // Edit user details
            .when('/account/users/:id/edit', {
                templateUrl: 'html/account/users/form.html',
                controller: 'account-users-edit'
            })

            /*
             * =====================
             *       Load Area
             * =====================
             */

            // Search load(s)
            .when('/loads/search', {
                templateUrl: 'html/loads/search.html',
                controller: 'search-load'
            })

            // Load details
            .when('/loads/:from/:id', {
                templateUrl: 'html/loads/view.html',
                controller: 'view-load'
            })

            /*
             * =====================
             *     Orders Section
             * =====================
             */

            // Dispatched Orders
            .when('/orders/dispatched', {
                templateUrl: 'html/orders/dispatched.html',
                controller: 'orders-dispatched'
            })

            // Picked up Orders
            .when('/orders/pickedup', {
                templateUrl: 'html/orders/pickedup.html',
                controller: 'orders-pickedup'
            })

            // Delivered Orders
            .when('/orders/delivered', {
                templateUrl: 'html/orders/delivered.html',
                controller: 'orders-delivered'
            })

            // Order Details
            .when('/orders/view/:id/:dispatched?', {
                templateUrl: 'html/orders/view.html',
                controller: 'view-order'
            })

            /**
             * =====================
             *       Default
             * =====================
             */

            // to Dashboard
            .otherwise({
                redirectTo: '/dashboard'
            });
    })

    .config(function ($momentProvider) {
        $momentProvider
            .asyncLoading(false)
            .scriptUrl('//cdnjs.cloudflare.com/ajax/libs/moment.js/2.5.1/moment.min.js');
    })

    // Default Variables
    .value('apiHost', '/api')

    .factory('authInterceptor', function ($injector, $q, $rootScope, $location, session, apiHost) {
        return {
            request: function (config) {
                config.headers = config.headers || {};
                var user = session.get();

                if (config.url.search(apiHost) !== -1 && user) {
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
                if ($window.sessionStorage.cs) {
                    return JSON.parse($window.sessionStorage.cs);
                }
                else {
                    return undefined;
                }
            },
            set: function (val) {
                $window.sessionStorage.cs = JSON.stringify(val);
            },
            del: function () {
                delete $window.sessionStorage.cs;
            }
        };
    })

    .run(function ($rootScope, $location, session, Notification, ddPricing, MobileDetectService) {
        $rootScope.$on('$routeChangeStart', function (event, next, current) {
            // For few paths we need to see if it's a mobile device if yes then change the URL Schema from http/https to custom one.
            var mobileRedirectionNeeded = ['/new-pass', '/activate'].some(function (route) {
                return (next.originalPath && next.originalPath.indexOf(route)) != -1;
            });

            if (mobileRedirectionNeeded && MobileDetectService.mobile()) {
                var url = location.href;
                url = url.replace(location.protocol, 'ddbol:');
                location.href = url;
                return;
            }
            var toPrivate = [
                '/signin', '/signup',
                '/reset-pass', '/new-pass',
                '/confirm-email', '/activate',
                '/user-invitation'
            ]
                .every(function (route) {
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
        $rootScope.ddPricing = ddPricing; // make Pricing Module available everywhere
        var user = session.get();
        if (user) {
            window.notification = new Notification(user.token, 'carrier');
            window.notification.create();

            $rootScope.loginUser = user.title;
            $rootScope.userRole = user.role;
            $rootScope.profileCompleted = user.profileCompleted;
        }
    })

    /**
     * @namespace site
     * @controller User Log-in
     */
    .controller('signin', function ($rootScope, $scope, $location, session, restApi, Notification) {
        $scope.auth = function () {
            $scope.error = false;

            restApi
                .post('/carrier/auth', { email: $scope.email, pass: $scope.pass })
                .success(function (user) {
                    window.notification = new Notification(user.token, 'carrier');
                    window.notification.create();

                    session.set(user);
                    $rootScope.loginUser = user.title;
                    $rootScope.userRole = user.role;
                    $rootScope.profileCompleted = user.profileCompleted;

                    if (user.role === 'Owner' && !user.profileCompleted) {
                        $location.path('/setup/start');
                    }
                    else {
                        $location.path('/dashboard');
                    }
                })
                .error(function (err) {
                    $scope.error = err;
                });
        };
    })

    /**
     * @namespace site
     * @controller Reset password
     */
    .controller('reset-pass', function ($scope, restApi) {
        $scope.forgot = function () {
            $scope.error = false;
            $scope.progress = true;

            restApi
                .post('/carrier/reset-pass', { email: $scope.email }).success(function (msg) {
                    $scope.progress = false;
                    $scope.success = msg;
                })
                .error(function (err) {
                    $scope.progress = false;
                    $scope.error = err;
                });
        };
    })

    /**
     * @namespace site
     * @controller New Password
     */
    .controller('new-pass', function ($scope, restApi, $routeParams) {
        var id = $routeParams.id;
        var token = $routeParams.token;

        if (!id || !token) {
            $scope.error = "Invalid password reset link";
            return;
        }

        $scope.progress = true;

        restApi
            .get('/carrier/reset-pass-info/' + id + '/' + token)
            .success(function (carrier) {
                $scope.progress = false;
                $scope.carrier = carrier;
            })
            .error(function (err) {
                $scope.progress = false;
                $scope.error = err;
            });

        $scope.reset = function () {
            $scope.activationForm.passDontMatch = false;
            $scope.error = false;

            if ($scope.carrier.password != $scope.carrier.password2) {
                $scope.activationForm.passDontMatch = true;
                return;
            }

            $scope.progress = true;

            restApi
                .post('/carrier/new-pass',
                {
                    id: id,
                    token: token,
                    password: $scope.carrier.password
                })
                .success(function (msg) {
                    $scope.progress = false;
                    $scope.success = msg;
                })
                .error(function (err) {
                    $scope.progress = false;
                    $scope.error = err;
                });
        };
    })

    /**
     * @namespace site
     * @controller Confirm Email
     */
    .controller('confirm-email', function ($scope, restApi, $routeParams) {
        var id = $routeParams.id;
        var token = $routeParams.token;
        if (!id || !token) {
            $scope.error = "Invalid email confirmation link";
            return;
        }
        $scope.progress = true;
        restApi.post('/carrier/confirm-email', {
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

    /**
     * @namespace site
     * @controller Register User
     */
    .controller('signup', function ($scope, restApi) {
        //$scope.step = 1;
        $scope.datePicker = {
            format: 'yyyy-mm-dd',
            startDate: new Date(),
            autoclose: true
        };
        // $scope.getCarrierInfo = function() {
        //     $scope.progress = true;
        //     $scope.error = false;
        //     $scope.success = false;
        //     restApi.get('/carrier/govinfo/' + $scope.dotNumber).success(function(carrier) {
        //         $scope.progress = false;
        //         $scope.carrier = carrier;
        //         $scope.carrierName = !!carrier.name;
        //         $scope.carrierPhone = !!carrier.phone;
        //         $scope.step = 2;
        //     }).error(function(err) {
        //         $scope.progress = false;
        //         $scope.error = err;
        //     });
        // };
        // $scope.goBack = function() {
        //     $scope.step = 1;
        //     $scope.carrier = null;  
        // };
        $scope.register = function () {
            $scope.progress = true;
            $scope.error = false;
            $scope.success = false;
            restApi.post('/carrier/register', $scope.carrier).success(function (data) {
                $scope.progress = false;
                $scope.success = data;
            }).error(function (err) {
                $scope.progress = false;
                $scope.error = err;
            });
        };
    })

    /**
     * @namespace site
     * @controller User invitation
     */
    .controller('user-invitation', function ($scope, $routeParams, restApi) {
        var id = $routeParams.id;
        var token = $routeParams.token;

        if (!id || !token) {
            $scope.error = "Invalid invitation link";
            return;
        }

        $scope.progress = true;

        restApi.get('/carrier/user-invitation/' + id + '/' + token).success(function (user) {
            $scope.progress = false;
            $scope.user = user;
        }).error(function (err) {
            $scope.progress = false;
            $scope.error = err;
        });

        $scope.activate = function () {
            $scope.activationForm.passDontMatch = false;
            $scope.error = false;

            if ($scope.user.password != $scope.user.password2) {
                $scope.activationForm.passDontMatch = true;
                return;
            }

            $scope.progress = true;

            restApi.post('/carrier/user-invitation/' + id + '/' + token, { password: $scope.user.password }).success(function (msg) {
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
     * @controller Account activatation
     */
    .controller('activate-account', function ($scope, restApi, $routeParams) {
        var id = $routeParams.id;
        var token = $routeParams.token;

        if (!id || !token) {
            $scope.error = "Invalid account activation link";
            return;
        }

        $scope.progress = true;

        restApi
            .get('/carrier/activate-info/' + id + '/' + token)
            .success(function (carrier) {
                $scope.progress = false;
                $scope.carrier = carrier;
            })
            .error(function (err) {
                $scope.progress = false;
                $scope.error = err;
            });

        $scope.activate = function () {
            $scope.activationForm.passDontMatch = false;
            $scope.error = false;

            if ($scope.carrier.password != $scope.carrier.password2) {
                $scope.activationForm.passDontMatch = true;
                return;
            }

            $scope.progress = true;

            restApi
                .post('/carrier/activate', {
                    id: id,
                    token: token,
                    password: $scope.carrier.password
                })
                .success(function (msg) {
                    $scope.progress = false;
                    $scope.success = msg;
                })
                .error(function (err) {
                    $scope.progress = false;
                    $scope.error = err;
                });
        };
    })

    /**
     * @namespace setup
     * @todo Write extra logic here
     * @controller Start Wizard
     */
    .controller('setup-start', function ($rootScope, $scope, $location) {
        // more logic here
    })

    /**
     * @namespace setup
     * @controller Completed
     */
    .controller('setup-done', function ($rootScope, $scope, $location, session, restApi) {
        $scope.done = function () {
            var user = session.get();
            user.profileCompleted = true;
            session.set(user);
            $rootScope.profileCompleted = true;
            restApi.get('/carrier/profile-complete');
            $location.path('dashboard');
        };
    })

    /**
     * @namespace setup
     * @controller Trucks
     */
    .controller('setup-truck', function ($rootScope, $scope, $location, restApi, Locale) {
        $scope.oroutes = [];
        $scope.droutes = [];

        $scope.insRoute = function (i, o, d) {
            $scope.oroutes[i] = new Locale(i);
            $scope.droutes[i] = new Locale(i);

            if (o) {
                $scope.oroutes[i].preLoad(o);

            }

            if (d) {
                $scope.droutes[i].preLoad(d);

            }
        };

        restApi
            .get('/carrier/trucks/0')
            .success(function (truck) {
                if (!truck) {
                    $scope.insert = true;
                    $scope.truck = { routes: [{ reverse: false }] };
                }
                else {
                    $scope.truck = truck;
                }

                $scope.truck.routes.forEach(function (t, i) {
                    $scope.insRoute(i, t.origin, t.destination);
                });
            });

        $scope.addRoute = function () {
            $scope.truck.routes.push({ reverse: false });
            var i = ($scope.truck.routes.length - 1);

            $scope.insRoute(i);
        };

        $scope.removeRoute = function (index) {
            $scope.truck.routes.splice(index, 1);
            $scope.oroutes.splice(index, 1);
            $scope.droutes.splice(index, 1);
        };

        $scope.save = function () {
            $scope.progress = true;
            $scope.error = false;
            var method, url;

            if ($scope.insert) {
                method = restApi.post;
                url = '/carrier/trucks';
            }
            else {
                method = restApi.put;
                url = '/carrier/trucks/0';
            }

            method(url, $scope.truck)
                .success(function (res) {
                    $scope.progress = false;
                    $location.path('setup/notifications');
                })
                .error(function (err) {
                    $scope.progress = false;
                    $scope.error = err;
                });
        };
    })

    /**
     * @namespace setup
     * @controller Douments
     */
    .controller('setup-docs', function ($rootScope, $scope, $location, session, apiHost, restApi, Notify) {
        $scope.moveNext = function () {
            $location.path('/setup/notifications');
        };

        restApi.get('/carrier/docs').success(function (docs) {
            $scope.docs = docs;
        });

        $scope.getDocLabel = function (docName) {
            switch (docName) {
                case 'mc':
                    return 'MC';
                case 'dot':
                    return 'DOT';
                case 'insurance':
                    return 'Insurance';
            }
        };

        $scope.showUpload = function (docName) {
            $('#docForm')[0].reset();
            $scope.modal = { docName: docName, title: $scope.getDocLabel(docName) };
            $('#uploadDialog').modal();
            $scope.responseMsg = null;
        };

        $scope.uploadDocument = function () {
            debugger;
            $scope.modal.error = false;
            var file = $('#docFile')[0].files[0];

            if (file.type != 'application/pdf') {
                $scope.modal.error = "Only PDF documents are allowed to be uploaded";
                Notify.error("Only PDF documents are allowed to be uploaded", { title: 'Error' });
                return;
            }

            if (file.size > 4 * 1024 * 1024) {

                Notify.error("File size should not exceed 4 MB", { title: 'Error' });
                $scope.modal.error = "File size should not exceed 4 MB";
                return;
            }

            var token = session.get().token;
            var form = new FormData();
            form.append('document', file);
            var url = apiHost + '/carrier/docs/' + $scope.modal.docName;

            $.ajax({
                type: "POST",
                url: url,
                data: form,
                headers: { 'Authorization': 'Bearer ' + token },
                xhr: function () {
                    var xhr = $.ajaxSettings.xhr();
                    xhr.upload.onprogress = function (e) {
                        $scope.modal.progress = e.loaded;
                    };
                    return xhr;
                },
                contentType: false,
                processData: false,
            })
                .done(function (res) {
                    $scope.modal.progress = null;
                    $('#docForm')[0].reset();
                    $('#uploadDialog').modal('hide');
                    $scope.responseMsg = res;
                    $scope.$apply(function () {
                        $scope.docs[$scope.modal.docName] = true;
                    });
                })
                .fail(function (err) {
                    $scope.modal.progress = null;
                    $scope.modal.error = err;
                    Notify.error(err.statusText, { title: 'Error' });
                });
        };

        $scope.viewDoc = function (docName) {
            var token = session.get().token;
            $scope.modal = { title: $scope.getDocLabel(docName) };
            $('#viewDocDialog').modal();

            $.ajax({
                type: "GET",
                url: apiHost + '/carrier/docs/' + docName,
                headers: { 'Authorization': 'Bearer ' + token }
            })
                .done(function (data) {
                    $("#docViewer").attr('src', 'data:application/pdf;base64,' + escape(data));
                });
        };

        $scope.deleteDoc = function (docName) {
            var token = session.get().token;

            $.ajax({
                type: "DELETE",
                url: apiHost + '/carrier/docs/' + docName,
                headers: { 'Authorization': 'Bearer ' + token }
            })
                .done(function (res) {
                    $scope.responseMsg = res;
                    $scope.$apply(function () {
                        $scope.docs[docName] = false;
                    });
                });
        };
    })

    /**
     * @namespace setup
     * @controller Notifications
     */
    .controller('setup-notifications', function ($rootScope, $scope, $location, restApi) {
        $scope.save = function () {
            $scope.error = false;
            $scope.progress = true;

            restApi
                .post('/carrier/save-phone', {
                    phone: $scope.sms.phone
                })
                .success(function (msg) {
                    $scope.sent = true;
                    $scope.submitted = false;
                    $scope.progress = false;
                })
                .error(function (err) {
                    $scope.error = err;
                    $scope.progress = false;
                });
        };

        $scope.verify = function () {
            $scope.error = false;
            $scope.progress = true;

            restApi
                .post('/carrier/verify-phone', {
                    code: $scope.sms.code
                })
                .success(function (msg) {
                    $location.path('/setup/done');
                })
                .error(function (err) {
                    $scope.error = err;
                    $scope.progress = false;
                });
        };
    })

    /**
     * @namespace account
     * @controller Dashboard
     */
    .controller('dashboard', function ($rootScope, $scope, session, restApi) {
        $rootScope.currentNavSec = 'dashboard';

        // notifications
        //		var user = session.get();
        //		window.notifications = new EventSource('/api/carrier/notifications/' + user.token);
        //		
        //		window.notifications.onmessage = function (evt)
        //		{
        //			var msg = JSON.parse(evt.data);
        //			
        //			switch (msg.type)
        //			{
        //				case 'load-alert':
        //					msg.url = 'loads/alerts/' + msg.id;
        //					break;
        //				case 'dispatch-alert':
        //					msg.url = 'orders/view/' + msg.id;
        //					break;
        //			}
        //			
        //			$rootScope.notifications = $rootScope.notifications || [];
        //			$rootScope.notifications.push(msg);
        //			
        //			//console.log(msg);
        //			
        //			$('#notificationPopup #title').text(msg.title);
        //			$('#notificationPopup #desc').text(msg.desc);
        //			
        //			$('#notificationPopup').fadeIn(function ()
        //			{
        //				setTimeout(function ()
        //				{
        //					$('#notificationPopup').fadeOut("slow");
        //				}, 2000);
        //			});
        //		};

    })

    /**
     * @namespace account
     * @controller My Notifications
     */


        // .filter('paginatn', function(){
        //     return function(items, start){
        //         var returningdata =[];
        //         if(start.limit>=items.length)
        //         {
        //             return items;
        //         }
        //             for(var i=start.start*start.limit;i<(start.start+1)*start.limit;i++)
        //             {
        //                 if(items[i]==null)
        //                 {
        //                     return returningdata;
        //                 }
        //                 returningdata.push(items[i]);
        //             }
        //             return returningdata;
        //         };
        //     })
    // ************************************************
    // ***********************************************
    .controller('notifications', function ($rootScope, $scope, restApi, $filter, $http, PaginationEx) {
        $scope.notifications = [];
        $rootScope.progress = true;
        // $scope.currentpage =0;
		// $scope.limitPage = 25;
		// $scope.nextPage = function(){
		// 	if($scope.currentpage<=Math.round(($scope.notifications.length)/$scope.limitPage)-1)
		// 	{
        //         debugger;
        //         if(typeof $scope.notifications[($scope.currentpage+1)*$scope.limitPage]==='undefined')
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
            restApi.get('/carrier/notifications', { params: p.getParams() }).success(function (data) {
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

            restApi.delete('/carrier/notifications/' + id).success(function () {
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

            $http.put('/api/carrier/notifications/' + id + '/read').success(function () {
                $rootScope.progress = false;
                $scope.notifications[idx].read = true;
                $rootScope.notificationsList[idxt].read = true;
            });
        };
    })

    /**
     * @namespace account
     * @controller Credentials Page
     */
    .controller('account-credentials', function ($rootScope, $scope, session, restApi, apiHost) {
        $rootScope.currentNavSec = 'account';

        restApi
            .get('/carrier/user')
            .success(function (carrier) {
                $scope.carrier = carrier;
            });
    })

    /**
     * @namespace account
     * @controller Change Emails
     */
    .controller('change-email', function ($rootScope, $scope, restApi) {
        $rootScope.currentNavSec = 'account';

        $scope.change = function () {
            $scope.error = false;
            $scope.progress = true;

            restApi
                .post('/carrier/change-email/', $scope.email)
                .success(function (msg) {
                    $scope.progress = false;
                    $scope.success = msg;
                })
                .error(function (err) {
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

            restApi
                .post('/carrier/change-password/', $scope.password)
                .success(function (msg) {
                    $scope.progress = false;
                    $scope.success = msg;
                })
                .error(function (err) {
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

        restApi
            .get('/carrier/company')
            .success(function (carrier) {
                $scope.carrier = carrier;
            });
    })

    /**
     * @namespace account/company
     * @controller Edit company details
     */
    .controller('account-company-edit', function ($rootScope, $scope, $location, session, restApi) {

        $rootScope.currentNavSec = 'account';

        $scope.datePicker = {
            format: 'yyyy-mm-dd',
            //startDate: new Date(),
            autoclose: true
        };

        restApi
            .get('/carrier/company')
            .success(function (carrier) {
                $scope.carrier = carrier;

            });

        $scope.save = function () {
            $scope.progress = true;
            $scope.error = false;

            restApi
                .put('/carrier/company', $scope.carrier)
                .success(function (res) {
                    $scope.progress = false;
                    $location.path('account/company');
                })
                .error(function (err) {
                    $scope.progress = false;
                    $scope.error = err;
                });
        };
    })

    /**
     * @namespace account
     * @controller Documents
     */
    .controller('account-docs', function ($rootScope, $scope, $location, session, restApi, apiHost, Confirm) {
        $rootScope.currentNavSec = 'account';

        restApi
            .get('/carrier/docs')
            .success(function (docs) {
                $scope.docs = docs;
            });

        $scope.getDocLabel = function (docName) {
            switch (docName) {
                case 'mc':
                    return 'MC';

                case 'dot':
                    return 'DOT';

                case 'insurance':
                    return 'Insurance';
            }
        };

        $scope.showUpload = function (docName) {
            $('#docForm')[0].reset();

            $scope.modal = {
                docName: docName,
                title: $scope.getDocLabel(docName)
            };

            $('#uploadDialog').modal();
            $scope.responseMsg = null;
        };

        $scope.uploadDocument = function () {
            debugger;
            $scope.modal.error = false;
            var file = $('#docFile')[0].files[0];

            if (file.type != 'application/pdf') {
                $scope.modal.error = "Only PDF documents are allowed to be uploaded";
                return;
            }

            if (file.size > 4 * 1024 * 1024) {
                $scope.modal.error = "File size should not exceed 4 MB";
                return;
            }

            var token = session.get().token;
            var form = new FormData();
            form.append('document', file);
            var url = apiHost + '/carrier/docs/' + $scope.modal.docName;

            $.ajax({
                type: "POST",
                url: url,
                data: form,
                headers: { 'Authorization': 'Bearer ' + token },
                xhr: function () {
                    var xhr = $.ajaxSettings.xhr();

                    xhr.upload.onprogress = function (e) {
                        $scope.modal.progress = e.loaded;
                    };

                    return xhr;
                },
                contentType: false,
                processData: false,
            })
                .done(function (res) {
                    $scope.modal.progress = null;

                    $('#docForm')[0].reset();
                    $('#uploadDialog').modal('hide');

                    $scope.responseMsg = res;
                    $scope.$apply(function () {
                        $scope.docs[$scope.modal.docName] = true;
                    });
                })
                .fail(function (err) {
                    $scope.modal.progress = null;
                    $scope.modal.error = err;
                });
        };

        $scope.viewDoc = function (docName) {
            var token = session.get().token;
            $scope.modal = { title: $scope.getDocLabel(docName) };

            $('#viewDocDialog').modal();

            $.ajax({
                type: "GET",
                url: apiHost + '/carrier/docs/' + docName,
                headers: { 'Authorization': 'Bearer ' + token }
            })
                .done(function (data) {
                    $("#docViewer").attr('src', 'data:application/pdf;base64,' + escape(data));
                });
        };

        $scope.deleteDoc = function (docName) {
            Confirm('Do you want to remove this document "' + docName + '"?', 'Confirm Delete',
                {
                    onOK: function () {
                        var token = session.get().token;
                        $.ajax({
                            type: "DELETE",
                            url: apiHost + '/carrier/docs/' + docName,
                            headers: { 'Authorization': 'Bearer ' + token }
                        })
                            .done(function (res) {
                                $scope.responseMsg = res;

                                $scope.$apply(function () {
                                    $scope.docs[docName] = false;
                                });
                            });
                    }
                });
        };
    })

    /**
     * @namespace account/trucks
     * @controller Trucks listing
     */
    .controller('account-trucks', function ($rootScope, $scope, $location, restApi, apiHost, Confirm) {
        $rootScope.currentNavSec = 'account';

        restApi.
            get('/carrier/trucks')
            .success(function (trucks) {
                $scope.trucks = trucks;
            });

        $scope.delete = function (index) {
            Confirm('Do you want to remove this truck?', 'Confirm Remove',
                {
                    onOK: function () {
                        restApi
                            .delete('/carrier/trucks/' + index)
                            .success(function (msg) {
                                $scope.trucks.splice(index, 1);
                            });
                    }
                });
        };
    })

    /**
     * @namespace account/trucks
     * @controller Add a Truck
     */
    .controller('account-trucks-add', function ($rootScope, $scope, $location, restApi, Locale) {
        $rootScope.currentNavSec = 'account';

        $scope.oroutes = [];
        $scope.droutes = [];

        $scope.mode = 'add';
        $scope.truck = { routes: [{ reverse: false }] };

        $scope.insRoute = function (i) {
            $scope.oroutes[i] = new Locale(i);
            $scope.droutes[i] = new Locale(i);
        };

        $scope.truck.routes.forEach(function (t, i) {
            $scope.insRoute(i);
        });

        $scope.addRoute = function () {
            $scope.truck.routes.push({ reverse: false });
            var i = ($scope.truck.routes.length - 1);

            $scope.insRoute(i);
        };

        $scope.removeRoute = function (index) {
            $scope.truck.routes.splice(index, 1);
            $scope.oroutes.splice(index, 1);
            $scope.droutes.splice(index, 1);
        };

        $scope.save = function () {
            $scope.progress = true;
            $scope.error = false;

            restApi
                .post('/carrier/trucks', $scope.truck)
                .success(function (res) {
                    $scope.progress = false;
                    $location.path('account/trucks');
                })
                .error(function (err) {
                    $scope.progress = false;
                    $scope.error = err;
                });
        };
    })

    /**
     * @namespace account/trucks
     * @controller Update truck details
     */
    .controller('account-trucks-edit', function ($rootScope, $scope, $location, $routeParams, restApi, Locale) {
        $rootScope.currentNavSec = 'account';
        $scope.oroutes = [];
        $scope.droutes = [];

        $scope.insRoute = function (i, o, d) {
            $scope.oroutes[i] = new Locale(i);
            $scope.droutes[i] = new Locale(i);

            if (o) {
                $scope.oroutes[i].preLoad(o);

            }

            if (d) {
                $scope.droutes[i].preLoad(d);

            }
        };


        $scope.mode = 'edit';

        restApi
            .get('/carrier/trucks/' + $routeParams.id)
            .success(function (truck) {
                if (!truck.routes) {
                    truck.routes = [{ reverse: false }];
                }

                $scope.truck = truck;

                $scope.truck.routes.forEach(function (t, i) {
                    $scope.insRoute(i, t.origin, t.destination);
                });
            });

        $scope.addRoute = function () {
            $scope.truck.routes.push({ reverse: false });

            var i = ($scope.truck.routes.length - 1);

            $scope.insRoute(i);
        };

        $scope.removeRoute = function (index) {
            $scope.truck.routes.splice(index, 1);
            $scope.oroutes.splice(index, 1);
            $scope.droutes.splice(index, 1);
        };

        $scope.save = function () {
            $scope.progress = true;
            $scope.error = false;

            restApi
                .put('/carrier/trucks/' + $routeParams.id, $scope.truck)
                .success(function (res) {
                    $scope.progress = false;
                    $location.path('account/trucks');
                })
                .error(function (err) {
                    $scope.progress = false;
                    $scope.error = err;
                });
        };
    })

    /**
     * @namespace account/users
     * @controller Users listing
     */
    .controller('account-users', function ($rootScope, $scope, $location, restApi, apiHost, Confirm) {
        $rootScope.currentNavSec = 'account';

        restApi.
            get('/carrier/users')
            .success(function (users) {
                $scope.users = users;
            });

        $scope.delete = function (index) {
            Confirm('Do you want to delete user with email: ' + $scope.users[index].email + ' ?', 'Confirm Delete?',
                {
                    onOK: function () {
                        restApi
                            .delete('/carrier/users/' + $scope.users[index]._id)
                            .success(function (msg) {
                                $scope.users.splice(index, 1);
                            });
                    }
                });
        };
    })

    /**
     * @namespace account/users
     * @controller Add a User
     */
    .controller('account-users-add', function ($rootScope, $scope, $location, restApi) {
        $rootScope.currentNavSec = 'account';

        restApi.
            get('/carrier/trucks?fields=name')
            .success(function (trucks) {
                $scope.trucks = trucks.map(function (truck) { return truck.name; });
            });

        $scope.mode = 'add';
        $scope.user = { type: 'Driver', enabled: true };

        $scope.save = function () {
            if ($scope.user.type === 'Manager') $scope.user.truckId = null;
            $scope.progress = true;
            $scope.error = false;

            restApi
                .post('/carrier/users', $scope.user)
                .success(function (res) {
                    $scope.progress = false;
                    $location.path('account/users');
                })
                .error(function (err) {
                    $scope.progress = false;
                    $scope.error = err;
                });
        };
    })

    /**
     * @namespace account/users
     * @controller Update user details
     */
    .controller('account-users-edit', function ($rootScope, $scope, $location, $routeParams, restApi, Locale) {
        $rootScope.currentNavSec = 'account';

        restApi.
            get('/carrier/trucks?fields=name')
            .success(function (trucks) {
                $scope.trucks = trucks.map(function (truck) { return truck.name; });
            });

        $scope.mode = 'edit';

        restApi
            .get('/carrier/users/' + $routeParams.id)
            .success(function (user) {
                $scope.user = user;
            });


        $scope.save = function () {
            if ($scope.user.type === 'Manager') $scope.user.truckId = null;
            $scope.progress = true;
            $scope.error = false;

            restApi
                .put('/carrier/users/' + $routeParams.id, $scope.user)
                .success(function (res) {
                    $scope.progress = false;
                    $location.path('account/users');
                })
                .error(function (err) {
                    $scope.progress = false;
                    $scope.error = err;
                });
        };
    })

    /**
     * @namespace account
     * @controller Billing Info
     */
    .controller('account-billing', function ($rootScope, $scope, $location, $routeParams, session, restApi, apiHost) {
        $rootScope.currentNavSec = 'account';
        $scope.progress = true;
        restApi.get('/carrier/creditcard').success(function (creditCard) {
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
            restApi.put('/carrier/creditcard', $scope.creditCard).success(function (creditCard) {
                $scope.progress = false;
                $scope.success = 1;
                $scope.showCCForm = false;
                $scope.currentCreditCard = creditCard;
                if ($routeParams.fromLoad) $location.path('loads/search/' + $routeParams.fromLoad);
            }).error(function (err) {
                $scope.progress = false;
                $scope.error = err;
            });
        };
    })
    
    .controller('search-load', function ($rootScope, $scope, $location, restApi, iDate, Locale, Toasty, cfg) {
        $scope.cfg = cfg;
        $scope.search = {
            pickup: {
                searchBy: 'Region'
            }, delivery: {
                searchBy: 'Region'
            },
            carrierType: 'Any'
        };

        $scope.iDate = iDate;
        $rootScope.currentNavSec = 'loads';
        $scope.currentPage = 'searchLoad';

        $scope.datePicker = {
            format: 'yyyy-mm-dd',
            startDate: new Date(),
            autoclose: true
        };

        $scope.searchLoad = function () {
            $scope.progress = true;
            $scope.error = false;
            var search = jQuery.extend(true, {}, $scope.search);
            if (search.pickup.searchBy === 'Region') {
                search.pickup.region = search.pickup.region.name;
            } else if (search.pickup.searchBy === 'State') {
                search.pickup.state = search.pickup.state.abbreviation;
            }
            if (search.delivery.searchBy === 'Region') {
                search.delivery.region = search.delivery.region.name;
            } else if (search.delivery.searchBy === 'State') {
                search.delivery.state = search.delivery.state.abbreviation;
            }
            restApi.post('/carrier/loads/search', search).success(function (orders) {
                $scope.progress = false;
                $scope.currentPage = 'searchResults';
                orders.forEach(function (order) {
                    order.vehiclesDesc = order.vehicles.reduce(
                        function (pv, cv) {
                            return pv + ', ' + cv.make + ' ' + cv.model + ' ' + cv.year;
                        }, ''
                    ).substr(1);
                    order.mapUrl = 'https://maps.googleapis.com/maps/api/staticmap?size=620x460&maptype=roadmap&markers=color:red%7Clabel:O%7C'
                        + encodeURI(order.pickup.city)
                        + '&markers=color:red%7Clabel:D%7C' + encodeURI(order.delivery.city)
                        + '&path=color:red%7Cweight:3%7Cenc:' + encodeURI(order.polylineEncoded)
                        + '&key=AIzaSyCfN2a6GaYXyfRiHos7S_4Pv9KnJlYns-A';
                    if (typeof order.package === 'undefined') {
                        order.package = cfg.package.default;
                    }
                });
                $scope.orders = orders;
            }).error(function (err) {
                $scope.progress = false;
                $scope.error = err;
            });
        };

        $scope.showLoad = function (order) {
            $scope.order = order;
            $scope.currentPage = 'viewLoad';
        };

        $scope.back = function () {
            $scope.currentPage = 'searchResults';
        };

        $scope.requestDispatch = function () {
            $scope.requestProgress = true;
            $scope.requestError = false;
            restApi.post('/carrier/request-dispatch/' + $scope.order._id, {
                pickupDate: $scope.order.pickupDate,
                deliveryDate: $scope.order.deliveryDate
            }).success(function (msg) {
                $scope.requestProgress = false;
                $location.path('orders/view/' + $scope.order._id + '/dispatched');
                //$scope.currentPage = 'searchResults';
            }).error(function (err) {
                $scope.requestProgress = false;
                $scope.requestError = err;
            });
        };
    })

    /**
     * @namespace loads
     * @controller View Load details
     */
    .controller('view-load', function ($rootScope, $scope, $moment, $location, $routeParams, restApi, cfg) {
        $scope.cfg = cfg;
        $rootScope.currentNavSec = 'loads';
        $scope.datePicker = { format: 'yyyy-mm-dd', startDate: new Date(), autoclose: true };

        $scope.backState = 'loads';

        if ($routeParams.from == 'search') {
            $scope.backState = 'loads/search';
        }

        $scope.bread = $routeParams.from.substring(0, 1).toUpperCase() + $routeParams.from.substring(1).toLowerCase();

        $scope.mainProgress = true;

        $scope.backToPage = function () {
            $location.path($scope.backState);
        };

        restApi.get('/carrier/creditcard').success(function (cc) {
            $scope.creditCardEntered = cc;
        });

        restApi.get('/carrier/loads/' + $routeParams.id).success(function (order) {
            $scope.mainProgress = false;

            if (typeof order.package === 'undefined') {
                order.package = cfg.package.default;
            }

            $scope.totalFee = $scope.ddPricing.getTotalFee(order.vehicles);

            $scope.ploc = order.pickup.location.city + ', ' + order.pickup.location.state + ' ' + order.pickup.location.zip;
            $scope.dloc = order.delivery.location.city + ', ' + order.delivery.location.state + ' ' + order.delivery.location.zip;

            var mapHeight = 205;

            order.mapUrl = 'https://maps.googleapis.com/maps/api/staticmap?size=620x' + mapHeight + '&maptype=roadmap&markers=color:red%7Clabel:O%7C'
                + encodeURI($scope.ploc) + '&markers=color:red%7Clabel:D%7C'
                + encodeURI($scope.dloc)
                + '&path=color:red%7Cweight:3%7Cenc:' + encodeURI(order.polylineEncoded)
                + '&key=AIzaSyCfN2a6GaYXyfRiHos7S_4Pv9KnJlYns-A';

            $scope.order = order;

        }).error(function (err) {
            $scope.mainError = err;
        });

        $scope.requestDispatch = function () {
            $scope.requestProgress = true;
            $scope.requestError = false;
            restApi.post('/carrier/request-dispatch/' + $scope.order._id, {
                pickupDate: $scope.order.pickupDate,
                deliveryDate: $scope.order.deliveryDate
            }).success(function (msg) {
                $scope.requestProgress = false;
                $location.path('orders/view/' + $scope.order._id + '/dispatched');
            }).error(function (err) {
                $scope.requestProgress = false;
                $scope.requestError = err;
            });
        };
    })

    /**
     * @namespace orders
     * @controller Pedning Orders list
     */
    .controller('orders-dispatched', function ($rootScope, $scope, restApi, iDate, cfg) {
         $scope.save =function(){
		 var scrollPosition = {
			 position:$(window).scrollTop()
		 };
      	localStorage.setItem("scrollPosition",JSON.stringify( scrollPosition));
	    }
        if(localStorage.getItem("scrollPosition"))
		{
			debugger
			var abc =JSON.parse(localStorage.getItem("scrollPosition"));
		setTimeout(function() {
			$('html,body').scrollTop(abc.position,0);
			localStorage.clear();
			// localStorage.setItem("scrollPosition",undefined);
		}, 2000);	
			//window.scrollTo(abc.position,0);
			
		}
        $scope.cfg = cfg;
        $scope.iDate = iDate;
        $rootScope.currentNavSec = 'orders';
        $scope.progress = true;

        $scope.toggleAssign = function () {
            $scope.selected = $scope.orders.some(function (order) {
                return order.selected;
            });
        };

        // $scope.Undispatch = function(Id){
        //     var data={
        //         id:Id
        //     };
        //     restApi
        //     .post('/carrier/orders/Undispatch',data)
        //     .success(function (res) {
        //        if(res.lastErrorObject.updatedExisting==true)
        //        {
        //            console.log('updated');
        //            restApi
        //             .get('/carrier/orders/dispatched')
        //             .success(function (orders) {
        //                 orders.forEach(function (order) {

        //                     order.vehiclesDesc = order.vehicles.reduce(function (pv, cv) {
        //                         return pv + ', ' + cv.make + ' ' + cv.model + ' ' + cv.year;
        //                     }, '').substr(1);

        //                     if (typeof order.package === 'undefined') {
        //                         order.package = cfg.package.default;
        //                     }
        //                 });

        //                 $scope.orders = orders;
        //                 $scope.progress = false;
        //             });
        //        }
        //     });
        // }

        restApi
            .get('/carrier/orders/dispatched')
            .success(function (orders) {
                orders.forEach(function (order) {

                    order.vehiclesDesc = order.vehicles.reduce(function (pv, cv) {
                        return pv + ', ' + cv.make + ' ' + cv.model + ' ' + cv.year;
                    }, '').substr(1);

                    if (typeof order.package === 'undefined') {
                        order.package = cfg.package.default;
                    }
                });

                $scope.orders = orders;
                $scope.progress = false;
            });
    })

    /**
     * @namespace orders
     * @controller Pickedup Orders list
     */
    .controller('orders-pickedup', function ($rootScope, $scope, restApi, iDate, cfg) {
        $scope.cfg = cfg;
        $scope.iDate = iDate;
        $rootScope.currentNavSec = 'orders';
        $scope.progress = true;
         $scope.save =function(){
		 var scrollPosition = {
			 position:$(window).scrollTop()
		 };
      	localStorage.setItem("scrollPosition",JSON.stringify( scrollPosition));
	    }
        if(localStorage.getItem("scrollPosition"))
		{
			var abc =JSON.parse(localStorage.getItem("scrollPosition"));
		setTimeout(function() {
			$('html,body').scrollTop(abc.position,0);
			localStorage.clear();
			// localStorage.setItem("scrollPosition",undefined);
		}, 2000);	
			//window.scrollTo(abc.position,0);
			
		}

        restApi
            .get('/carrier/orders/pickedup').success(function (orders) {
                orders.forEach(function (order) {

                    order.vehiclesDesc = order.vehicles.reduce(function (pv, cv) {
                        return pv + ', ' + cv.make + ' ' + cv.model + ' ' + cv.year;
                    }, '').substr(1);

                    if (typeof order.package === 'undefined') {
                        order.package = cfg.package.default;
                    }

                });

                $scope.orders = orders
                $scope.progress = false;
            });
    })

    /**
     * @namespace orders
     * @controller Delivered Orders list
     */
    .controller('orders-delivered', function ($rootScope, $scope, restApi, iDate, cfg) {
        $scope.cfg = cfg;
        $scope.iDate = iDate;
        $rootScope.currentNavSec = 'orders';
        $scope.progress = true;
         $scope.save =function(){
             console.log('hii');
		 var scrollPosition = {
			 position:$(window).scrollTop()
		 };
      	localStorage.setItem("scrollPosition",JSON.stringify( scrollPosition));
	    }
        if(localStorage.getItem("scrollPosition"))
		{
			debugger
			var abc =JSON.parse(localStorage.getItem("scrollPosition"));
		setTimeout(function() {
			$('html,body').scrollTop(abc.position,0);
			localStorage.clear();
			// localStorage.setItem("scrollPosition",undefined);
		}, 2000);	
			//window.scrollTo(abc.position,0);
			
		}

        restApi
            .get('/carrier/orders/delivered').success(function (orders) {
                orders.forEach(function (order) {

                    order.vehiclesDesc = order.vehicles.reduce(
                        function (pv, cv) {
                            return pv + ', ' + cv.make + ' ' + cv.model + ' ' + cv.year;
                        }, ''
                    ).substr(1);

                    if (typeof order.package === 'undefined') {
                        order.package = cfg.package.default;
                    }
                });

                $scope.orders = orders;
                $scope.progress = false;
            });
    })

    /**
     * @namespace orders
     * @controller View Order
     */
    .controller('view-order', function ($rootScope, $scope, $location, $routeParams, restApi, cfg) {
        $scope.cfg = cfg;
        $rootScope.currentNavSec = 'orders';
        $scope.mainProgress = true;

        $scope.fromDispatched = $routeParams.dispatched;
        $("input:radio").click(function() {
            if ($(this).is(":checked")) {
                console.log($(this).attr("value"));
                $scope.reason = $(this).attr("value");
                $(this).prop("checked", true);
            } else {
                $(this).prop("checked", false);
            }
        });
        $('.myCheckbox').click(function() {
            $(this).siblings('input:checkbox').prop('checked', false);
        });

         $scope.Undispatch = function(){
            var data={
                reason:$scope.reason,
                id:$scope.order._id
            };
            restApi
            .post('/carrier/orders/Undispatch',data)
            .success(function (res) {
               if(res.lastErrorObject.updatedExisting==true)
               {
                   console.log('updated');
                   $('#CategoryModal').modal('toggle');
                   window.location.reload(); 
               }
            });
        }

        var updateStatus = function () {
            switch ($scope.order.status) {
                case 'Dispatched':
                    $scope.statusClass = "alert-warning";
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

        restApi
            .get('/carrier/orders/' + $routeParams.id)
            .success(function (order) {
                $scope.mainProgress = false;
                $scope.mainError = false;

                if (typeof order.package === 'undefined') {
                    order.package = cfg.package.default;
                }

                $scope.order = order;

                $scope.totalFee = $scope.ddPricing.getTotalFee(order.vehicles);

                $scope.hasAuction = order.pickup.fromAuction;


                $scope.ploc = order.pickup.location.city + ', ' + order.pickup.location.state + ' ' + order.pickup.location.zip;
                $scope.dloc = order.delivery.location.city + ', ' + order.delivery.location.state + ' ' + order.delivery.location.zip;

                $scope.mapUrl = 'https://maps.googleapis.com/maps/api/staticmap?size=650x450&maptype=roadmap&markers=color:red%7Clabel:O%7C'
                    + encodeURI($scope.ploc) + '&markers=color:red%7Clabel:D%7C' + encodeURI($scope.dloc)
                    + '&path=color:red%7Cweight:3%7Cenc:' + encodeURI(order.polylineEncoded) + '&key=AIzaSyCfN2a6GaYXyfRiHos7S_4Pv9KnJlYns-A';

                updateStatus();
            })
            .error(function (err) {
                $scope.mainProgress = false;
                $scope.mainError = err;
            });

        $scope.pickup = function () {
            $scope.progress = true;

            restApi
                .get('/carrier/orders/' + $scope.order._id + '/pickup').success(function (res) {
                    $scope.progress = false;
                    $scope.order.status = 'Pickedup';
                    updateStatus();
                    $location.path('orders/view/' + $scope.order._id);

                })
                .error(function (err) {
                    $scope.progress = false;
                    $scope.error = err;
                });
        };

        $scope.deliver = function () {
            $scope.progress = true;

            restApi
                .get('/carrier/orders/' + $scope.order._id + '/deliver')
                .success(function (res) {
                    $scope.progress = false;
                    $scope.order.status = 'Delivered';
                    updateStatus();
                })
                .error(function (err) {
                    $scope.progress = false;
                    $scope.error = err;
                });
        };
    });
