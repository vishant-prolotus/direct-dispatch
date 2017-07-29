/**
 * @namespace ui.app
 * @author Junaid Atari <mj.atari@gmail.com>
 * @copyright 2015 Direct-Dispatch.com
 * @type {object|module}
 * @property {Integer} UI_PaginationSize Pagination items per page
 * Application User Interface Library
 */
angular

	// @declare Module
	.module('ui.app', [
		'dd.common', 'jlareau.pnotify', 'ngAnimate', 'angular-toasty', 'ngMask', 'localytics.directives'
	])

	.factory('cfg', function () {
		var cfg = {};

		cfg.pagination = {
			itemsPerPage: 25,
			pageSizeList: [10, 25, 50, 100],
			defSortOrder: 1
		};

		cfg.locale = {
			shortDate: 'yyyy-MM-dd',
			shortTime: 'hh:mm a'
		};

		cfg.locale.shortDateTime = cfg.locale.shortDate + ' ' + cfg.locale.shortTime;

		cfg.package = {
			list: {
				'Standard': {
					days: 7,
					price: 0,
					likelihood: '85%'
				},
				'Expedited': {
					days: 5,
					price: 50,
					likelihood: '90%'
				},
				'Rush': {
					days: 2,
					price: 100,
					likelihood: '95%'
				}
			},
			'default': 'Standard',
			getPrice: function (name) {
				return typeof cfg.package.list[name] === 'undefined'
					? null
					: cfg.package.list[name].price;
			},
			getDays: function (name) {
				return typeof cfg.package.list[name] === 'undefined'
					? null
					: cfg.package.list[name].days;
			},
			getLikelihood: function (name) {
				return typeof cfg.package.list[name] === 'undefined'
					? null
					: cfg.package.list[name].likelihood;
			},

			exists: function (n) {
				return typeof cfg.package.list[n] === 'undefined'
					? false
					: true;
			}
		};

		return cfg;
	})

	.config(['notificationServiceProvider', function (notificationServiceProvider) {
		notificationServiceProvider.setDefaults({
			history: false,
			closer: false,
			closer_hover: true
		});
	}])

	// <button go-click="/go/to/this">Click!</button>
	.directive('goClick', function ($location) {
		return function (scope, element, attrs) {
			var path;

			attrs.$observe('goClick', function (val) {
				path = val;
			});

			element.bind('click', function () {
				scope.$apply(function () {
					$location.path(path);
				});
			});
		};
	})

	/**
	 * @filter
	 * Convert string to propercase
	 */
	.filter('propercase', function () {
		return function (input) {
			return !$.trim(input)
				? ''
				: input.replace(/\w\S*/g, function (txt) { return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase(); });
		};
	})

	/**
	 * @filter
	 * Convert string to propercase
	 */
	.filter('inputna', function () {
		return function (input) {
			return $.trim(input)
				? input
				: 'Not Set';
		};
	})

	/**
	 * @filter
	 * @param {Object} input Object to search in
	 * @param {String} id Value to be searched
	 * Search objects in an array
	 */
	.filter('findBy', function () {
		return function (input, id) {
			var i = 0, len = input.length;

			for (; i < len; i++) {
				if (+input[i].id == +id) {
					return input[i];
				}
			}

			return null;
		};
	})

	.factory('iDate', function () {

		var iDate = {};

		iDate.isValid = function (d) {
			return moment().isValid(d);
		};

		iDate.isToday = function (d) {
			return moment(d).isSame(moment(), 'day');
		};

		iDate.isFuture = function (d) {
			return moment(d).isAfter(moment());
		};

		iDate.isPast = function (d) {
			return !iDate.isFuture(d) && !iDate.isToday(d);
		};

		return iDate;
	})

	.factory('Toasty', function (toasty) {
		var Toasty = {};

		var getData = function (message, caption, options) {
			var _data = {};

			_data.msg = message,
				_data.title = caption,
				_data.showClose = false,
				_data.clickToClose = true,
				_data.timeout = 3000;

			return $.extend(_data, (options || {}));
		};

		Toasty.success = function (message, caption, options) {
			toasty.success(getData(message, (caption || 'Success'), options));
		};

		Toasty.warning = function (message, caption, options) {
			toasty.warning(getData(message, (caption || 'Warning!'), options));
		};

		Toasty.wait = function (message, caption, options) {

			toasty.wait(getData(message, (caption || 'Please Wait'), options));
		};

		Toasty.error = function (message, caption, options) {
			toasty.error(getData(message, (caption || 'Error!'), options));
		};

		Toasty.info = function (message, caption, options) {
			toasty.info(getData(message, (caption || 'Info'), options));
		};

		return Toasty;
	})

	.factory('Notify', function (notificationService) {

		var Notify = {};
		var _notifyOptions = {
			text_escape: false,
			styling: "bootstrap3",
			type: "notice",
			icon: true,
			delay: 1500,
			shadow: false,
			buttons: {
				closer: true,
				sticker: false
			}
		};

		Notify.notice = function (msg, options) {
			var _options = $.extend(_notifyOptions, { text: msg, type: "notice" }, (options || {}));

			notificationService.notify(_options).get().click(function () {
				this.remove();
			});
		};

		Notify.error = function (msg, options) {
			var _options = $.extend(_notifyOptions, { text: msg, type: "error" }, (options || {}));

			notificationService.notify(_options).get().click(function () {
				this.remove();
			});
		};

		Notify.success = function (msg, options) {
			var _options = $.extend(_notifyOptions, { text: msg, type: "success" }, (options || {}));

			notificationService.notify(_options).get().click(function () {
				this.remove();
			});
		};

		return Notify;
	})

	/**
	 * Pagination Plugin<br>
	 * Call as new Pagination();
	 * @param {Array} item Set the items
	 * @param {Integer} perPage (optional) Items number per page
	 * @returns {Function}
	 */
	.factory('Pagination', function (Utils, cfg) {
		return function (items, perPage, sortBy, pageChange, afterInit) {
			debugger;
			/**
			 * Current Instance
			 * @private
			 * @type {object}
			 */
			var _ = this;

			/**
			 * Items Source
			 * @private
			 * @type Array
			 */
			var _items = [];

			this.sortDefault = sortBy;

			/**
			 * Display items per page (default 20)
			 * @type {Integer}
			 */
			this.itemsPerPage = perPage || cfg.pagination.ItemsPerPage;

			/**
			 * First page (default 1)
			 * @type {Integer}
			 */
			this.currentPage = 1;

			/**
			 * Set new items
			 * @param {Array} ary Array of items
			 * @returns {Pagination}
			 */
			this.setItems = function (ary, sortBy) {
				return _items = Utils.getSorted(ary, sortBy), _;
			};

			/**
			 * Sort items
			 * @returns {Pagination}
			 */
			this.sortOn = function ($event, attr) {
				obj = $($event.currentTarget);
				cur = 0;

				if (obj.attr('data-sortrev') === '') {
					obj.attr('data-sortrev', cur);
				}
				else {
					cur = Number(obj.attr('data-sortrev')) ? 0 : 1;

					obj.attr('data-sortrev', cur);
				}

				var sorter = [];
				sorter[0] = attr, sorter[1] = Boolean(cur);//, sorter[2] = callback;

				_.currentPage = 1;

				_items = Utils.getSorted(_items, sorter);

				pageChange();

				_afterInit(this, this);

				return _;
			};

			/**
			 * Get count of total items
			 * @returns {Number}
			 */
			this.getItemsCount = function () {
				return _items.length;
			};

			/**
			 * Get count of total pages 
			 * @returns {Number}
			 */
			this.getPagesCount = function () {
				return Math.ceil(_items.length / this.itemsPerPage);
			};

			/**
			 * Get the paginated items
			 * @returns {array}
			 */
			this.getPagedItems = function () {
				var begin = ((this.currentPage - 1) * this.itemsPerPage),
					end = begin + this.itemsPerPage;

				return _items.slice(begin, end);
			};

			this.onPageChange = pageChange || function () { };

			this.setRowsSelection = function () {
				$('.ui-sel-options .select-all').click(function () {
					$('.checkorder').not(':checked').trigger('click');
				});

				$('.ui-sel-options .select-none').click(function () {
					$('.checkorder:checked').trigger('click');
				});

				$('.ui-sel-options .select-random').click(function () {
					$('.checkorder').trigger('click');
				});
			};

			this.setRowsSelection();

			var _afterInit = afterInit;

			// Set items
			this.setItems(items, sortBy);

			if (typeof (afterInit) === 'function') {
				afterInit.call(this, this);
			}

			return this;
		};
	})

	/**
		 * Pagination Plugin<br>
		 * Call as new Pagination();
		 * @param {Array} item Set the items
		 * @param {Integer} perPage (optional) Items number per page
		 * @returns {Function}
		 */
	.factory('PaginationEx', function (Utils, cfg, Notify) {
		return function (limit, searchBy, sortBy, sortOrder) {
			var _params = {};

			/**
			 * Current Instance
			 * @private
			 * @type {object}
			 */
			var _ = this;

			_.loading = false;

			this.pageSizeList = cfg.pagination.pageSizeList;

			this.total = 0;

			this.currentPage = 1;

			// Default sort order
			this.defSortOrder = cfg.pagination.defSortOrder;

			//{{ Query Params
			// optional string: name of property of entity e.g. name, _id, origin, etc. (default: _id)
			this.sortBy = (sortBy || null),
				// optional integer: 1 means ascending and -1 means descending order (default: 1)
				this.sortOrder = sortOrder || _.defSortOrder,
				// optional integer: skips first n limits for given sort (default: 0)
				this.skip = null,
				// optional integer: returns the n items for results (default: 100)
				this.limit = limit || cfg.pagination.itemsPerPage,
				// optional string: property name of entity like name, origin, destination, etc. to search for
				this.searchBy = (searchBy || ''),
				// optional string: the value to perform match against the given attribute
				this.searchQuery = null;
			// }}

			this.hasCount = function () {
				return Boolean(_.total);
			};

			this.setTotal = function (n) {
				_.total = Number(n);
			};

			this.jumpToPage = function () {
				_.currentPage = Number(_.currentPage);

				if (_.currentPage > _.getPagesCount()) {
					_.currentPage = _.getPagesCount();
				}
				else if (_.getPagesCount() < _.currentPage || _.currentPage < 1) {
					_.currentPage = 1;
				}

				_.onPageChange();
			};

			this.isSearched = function () {
				return Boolean($.trim(_.searchQuery));
			};

			this.inputResetSearch = function () {
				if ($.trim(_.searchQuery)) {
					return;
				}

				_.resetSearch();
			};

			this.resetSearch = function () {
				_.searchQuery = '';
				_.onChange();
			};

			this.doSearch = function () {
				var kw = $.trim(_.searchQuery);

				if (kw == '') {
					Notify.notice('Please enter a keyword.', -1);
					return;
				}

				_.loading = true;

				_.onChange();
			};

			/**
			 * Get count of total pages 
			 * @returns {Number}
			 */
			this.getPagesCount = function () {
				return Math.ceil(_.total / _.limit);
			};

			// optional function: executes when the params changed
			this.onChange = function (callback) {
				_.loading = true;

				if (typeof callback === 'function') {
					_onChangeCallback = callback;
				}

				_onChangeCallback.call(this, this);

				_.hasNoRecord = !Boolean(_.total);
			};

			this.onPageChange = function () {
				_.skip = (_.currentPage - 1) * _.limit;
				_.onChange();
			};

			/**
			 * Get a query params list for request
			 * @returns {Object} params array
			 */
			this.getParams = function () {
				debugger;
				var params = {};

				if (_.sortBy) {
					params['sortBy'] = _.sortBy;
				}

				if (_.sortOrder) {
					params['sortOrder'] = _.sortOrder;
				}

				if (_.skip) {
					params['skip'] = _.skip;
				}

				if (_.limit) {
					params['limit'] = _.limit;
				}

				if (_.searchBy) {
					params['searchBy'] = _.searchBy;
				}

				if (_.searchQuery) {
					params['searchQuery'] = _.searchQuery;
				}

				return $.extend(params, _params);
			};

			this.addParam = function (key, val) {
				return _params[key] = val, _;
			};

			this.clearParams = function () {
				_params = {};
			};

			/**
			 * Check the order typeof is Ascending
			 * @returns {Boolean}
			 */
			this.isAsn = function () {
				return (_.sortOrder === 1);
			};

			/**
			 * Check that current sort attribute is
			 * @param {String} attr Name of attribute
			 * @returns {Boolean}
			 */
			this.hasSortBy = function (attr) {
				return _.sortBy === attr;
			};

			/**
			 * Get pagination info
			 * @returns {String}
			 */
			this.getInfo = function () {
				var _limit = (_.limit > _.total ? _.total : (_.currentPage * _.limit));

				if (_limit > _.total) {
					_limit = _.total;
				}

				var _skip = (_.skip || 1);

				var from = (_skip > _.total ? 0 : _skip);

				return (from > 1 ? from + 1 : from) + '-' + _limit + ' of ' + _.total;
			};

			/**
			 * 
			 * @param {Object} $event
			 * @param {String} col
			 * @param {integer} order
			 * @returns {Pagination}
			 */
			this.sortByAttr = function ($event, col, order) {
				_.sortBy = col;

				var order = _.defSortOrder;

				if (typeof order === 'undefined') {
					$($event.currentTarget).attr('data-order', _.defSortOrder);
					order = _.defSortOrder;
				}

				order = $($event.currentTarget).attr('data-order') === '1' ? -1 : 1;

				$($event.currentTarget).attr('data-order', order);

				_.skip = 0;
				_.currentPage = 1;
				_.sortOrder = order;

				_.onChange();

				return _;
			};

			this.start = function () {
				$('.ui-sel-options .select-all').click(function () {
					$('.checkorder').not(':checked').trigger('click');
				});

				$('.ui-sel-options .select-none').click(function () {
					$('.checkorder:checked').trigger('click');
				});

				$('.ui-sel-options .select-random').click(function () {
					$('.checkorder').trigger('click');
				});

				if (typeof _.onChange === 'function') {
					_.onChange.call(this, this);
				}

				return _;
			};

			return this;
		};
	})

	.factory('Breadcrumb', function () {
		var Breadcrumb = {};

		Breadcrumb.render = function (elements, options) {

			if (!elements.length) {
				return null;
			}
		};

		return Breadcrumb;
	})

	/**
	 * Basic utility functions Plugin<br>
	 * @returns {object}
	 */
	.factory('Utils', function () {
		var Utils = {};

		/**
		 * Sort the object
		 * @param {String} field Key name
		 * @param {Boolean} reverse Sorting Order
		 * @param {Function} primer (optional) A function call by each item
		 * @returns {Array} Final array
		 */
		Utils.sortBy = function (field, reverse, primer) {
			var key = primer ?
				function (x) { return primer(x[field]) } :
				function (x) { return x[field] };

			reverse = (!reverse ? 1 : -1);

			return function (a, b) {
				return a = key(a), b = key(b), reverse * ((a > b) - (b > a));
			};
		};

		/**
		 * Get sorted array
		 * @param {Array} ary Set of collections
		 * @param {Object} sortBy Sort by Options [string keyName, boolean Order, function callback]
		 * @returns {Array} Final array
		 */
		Utils.getSorted = function (ary, sortBy) {
			if (typeof (ary) !== 'object' || !ary.length) {
				return [];
			}

			if (typeof (sortBy) !== 'object' || !sortBy.length) {
				return ary;
			}

			// Reverse order
			rev = sortBy.length === 2 ? Boolean(sortBy[1]) : false;
			callback = sortBy.length === 3 ? sortBy[2] : null;

			return ary.sort(Utils.sortBy(sortBy[0], rev, callback));
		};

		return Utils;
	})

	/**
	 * Ajax Image based spinner
	 * @returns object
	 */
	.factory('Spinner', function () {
		return {
			hide: function () {
				$('#ajax-loader').fadeOut(200);
			},
			show: function () {
				$('#ajax-loader').fadeIn();
			}
		};
	})

	.factory('Package', function ($uibModal, cfg) {
		return function (name, options, config) {
			var _options = $.extend({
				onOK: null,
				onCancel: null,
				onDismiss: null
			}, (options || {}));

			var _config = $.extend(
				{
					templateUrl: '/core/ui-app-resource/tpl/dialog.packages.html',
					keyboard: false,
					backdrop: 'static',
					size: 'sm',
					controller: function ($scope, $uibModalInstance) {
						$scope.package = name;
						$scope.cfg = cfg;

						$scope.OK = function () {
							if (typeof _options.onOK === 'function') {
								_options.onOK.call(this, $scope.package);
							}

							$uibModalInstance.dismiss('close');

							if (typeof _options.onDismiss === 'function') {
								_options.onDismiss.call(this);
							}
						};

						$scope.cancel = function () {
							if (typeof _options.onCancel === 'function') {
								_options.onCancel.call(this);
							}

							$uibModalInstance.dismiss('close');

							if (typeof _options.onDismiss === 'function') {
								_options.onDismiss.call(this);
							}
						};
					}
				}, (config || {}));

			return $uibModal.open(_config);
		};
	})

	/**
	 * Show an Alert message
	 * @param {String} message Message to be displayed
	 * @param {String} title (optional) Dialog Title
	 * @param {object} options (optional) Additional Options, Events
	 * @param {object} config (optional) Dialog Configuration
	 * @returns {Function}
	 */
	.factory('Alert', function ($uibModal) {
		return function (message, title, options, config) {
			var _options = $.extend({
				onClose: null,
				onDismiss: null
			}, (options || {}));

			var _config = $.extend(
				{
					templateUrl: '/core/ui-app-resource/tpl/dialog.alert.html',
					controller: function ($scope, $uibModalInstance) {
						$scope.message = message;
						$scope.title = title || 'Alert';

						$scope.cancel = function () {
							if (typeof _options.onDismiss === 'function') {
								_options.onDismiss.call(this);
							}

							$uibModalInstance.dismiss('cancel');
						};

						$scope.close = function () {
							if (typeof _options.onClose === 'function') {
								_options.onClose.call(this);
							}

							$uibModalInstance.dismiss('close');
						};
					}
				}, (config || {}));

			return $uibModal.open(_config);
		};
	})

	.factory('OrderStatus', function () {
		var list = {
			'Pending': {
				'icon': 'fa fa-clock-o',
				'color': '#f0ad4e'
			},
			'Dispatched': {
				'icon': 'fa fa-paper-plane',
				'color': '#ad63d3'
			},
			'Pickedup': {
				'icon': 'fa fa-arrow-circle-down',
				'color': '#337ab7'
			},
			'Delivered': {
				'icon': 'fa fa-arrow-circle-up',
				'color': '#5cb85c'
			},
			'Cancelled': {
				'icon': 'fa fa-times-circle',
				'color': '#d9534f'
			}
		};

		var Status = {};

		Status.icon = function (status) {
			return list[status].icon;
		};

		Status.color = function (status) {
			return list[status].color;
		};

		return Status;
	})

	/**
	 * Show a Confirm Message Dialog
	 * @param {String} message Message to be displayed
	 * @param {String} title (optional) Dialog Title
	 * @param {object} options (optional) Additional Options, Events
	 * @param {object} config (optional) Dialog Configuration
	 * @returns {Function}
	 */
	.factory('Confirm', function ($uibModal) {
		return function (message, title, options, config) {
			var _options = $.extend({
				onOK: null,
				onCancel: null,
				onDismiss: null
			}, (options || {}));

			var _config = $.extend(
				{
					templateUrl: '/core/ui-app-resource/tpl/dialog.confirm.html',
					keyboard: false,
					backdrop: 'static',
					controller: function ($scope, $uibModalInstance) {
						$scope.message = message;
						$scope.title = title || 'Confirm';

						$scope.OK = function () {
							if (typeof _options.onOK === 'function') {
								_options.onOK.call(this);
							}

							$uibModalInstance.dismiss('close');

							if (typeof _options.onDismiss === 'function') {
								_options.onDismiss.call(this);
							}
						};

						$scope.cancel = function () {
							if (typeof _options.onCancel === 'function') {
								_options.onCancel.call(this);
							}

							$uibModalInstance.dismiss('close');

							if (typeof _options.onDismiss === 'function') {
								_options.onDismiss.call(this);
							}
						};
					}
				}, (config || {}));

			return $uibModal.open(_config);
		};
	})

	.directive('ngEnter', function () {
		return function (scope, element, attrs) {
			element.bind("keydown keypress", function (event) {
				if (event.which === 13) {
					scope.$apply(function () {
						scope.$eval(attrs.ngEnter);
					});
					event.preventDefault();
				}
			});
		};
	})

	.filter('tel', function () {
		return function (tel) {
			if (!tel) { return ''; }

			var value = tel.toString().trim().replace(/^\+/, '');

			if (value.match(/[^0-9]/)) {
				return tel;
			}

			var country, city, number;

			switch (value.length) {
				case 10: // +1PPP####### -> C (PPP) ###-####
					country = 1;
					city = value.slice(0, 3);
					number = value.slice(3);
					break;

				case 11: // +CPPP####### -> CCC (PP) ###-####
					country = value[0];
					city = value.slice(1, 4);
					number = value.slice(4);
					break;

				case 12: // +CCCPP####### -> CCC (PP) ###-####
					country = value.slice(0, 3);
					city = value.slice(3, 5);
					number = value.slice(5);
					break;

				default:
					return tel;
			}

			if (country == 1) {
				country = "";
			}

			number = number.slice(0, 3) + '-' + number.slice(3);

			return (country + " (" + city + ") " + number).trim();
		};
	})

	.factory('States', function () {
		return {
			"AA": "Armed Forces Americas (except Canada)",
			"AE": "Armed Forces Europe, Middle East, Africa, and Canada",
			"AK": "Alaska",
			"AL": "Alabama",
			"AP": "Armed Forces Pacific",
			"AR": "Arkansas",
			"AS": "American Samoa",
			"AZ": "Arizona",
			"CA": "California",
			"CO": "Colorado",
			"CT": "Connecticut",
			"DC": "District of Columbia",
			"DE": "Delaware",
			"FL": "Florida",
			"FM": "Federated States of Micronesia",
			"GA": "Georgia",
			"GU": "Guam",
			"HI": "Hawaii",
			"IA": "Iowa",
			"ID": "Idaho",
			"IL": "Illinois",
			"IN": "Indiana",
			"KS": "Kansas",
			"KY": "Kentucky",
			"LA": "Louisiana",
			"MA": "Massachusetts",
			"MD": "Maryland",
			"ME": "Maine",
			"MH": "Marshall Islands",
			"MI": "Michigan",
			"MN": "Minnesota",
			"MO": "Missouri",
			"MP": "Northern Mariana Islands",
			"MS": "Mississippi",
			"MT": "Montana",
			"NC": "North Carolina",
			"ND": "North Dakota",
			"NE": "Nebraska",
			"NH": "New Hampshire",
			"NJ": "New Jersey",
			"NM": "New Mexico",
			"NV": "Nevada",
			"NY": "New York",
			"OH": "Ohio",
			"OK": "Oklahoma",
			"OR": "Oregon",
			"PA": "Pennsylvania",
			"PR": "Puerto Rico",
			"PW": "Palau",
			"RI": "Rhode Island",
			"SC": "South Carolina",
			"SD": "South Dakota",
			"TN": "Tennessee",
			"TX": "Texas",
			"UT": "Utah",
			"VA": "Virginia",
			"VI": "Virgin Islands",
			"VT": "Vermont",
			"WA": "Washington",
			"WI": "Wisconsin",
			"WV": "West Virginia",
			"WY": "Wyoming"
		};
	})

	.factory('Locale', function (restApi, $http, Toasty) {
		return function (id) {
			var Locale = {};
			Locale.id = id || '';
			Locale.cities = [];
			Locale.zips = [];
			Locale.zipCode = '';
			Locale.states = {
				"AA": "Armed Forces Americas (except Canada)",
				"AE": "Armed Forces Europe, Middle East, Africa, and Canada",
				"AK": "Alaska",
				"AL": "Alabama",
				"AP": "Armed Forces Pacific",
				"AR": "Arkansas",
				"AS": "American Samoa",
				"AZ": "Arizona",
				"CA": "California",
				"CO": "Colorado",
				"CT": "Connecticut",
				"DC": "District of Columbia",
				"DE": "Delaware",
				"FL": "Florida",
				"FM": "Federated States of Micronesia",
				"GA": "Georgia",
				"GU": "Guam",
				"HI": "Hawaii",
				"IA": "Iowa",
				"ID": "Idaho",
				"IL": "Illinois",
				"IN": "Indiana",
				"KS": "Kansas",
				"KY": "Kentucky",
				"LA": "Louisiana",
				"MA": "Massachusetts",
				"MD": "Maryland",
				"ME": "Maine",
				"MH": "Marshall Islands",
				"MI": "Michigan",
				"MN": "Minnesota",
				"MO": "Missouri",
				"MP": "Northern Mariana Islands",
				"MS": "Mississippi",
				"MT": "Montana",
				"NC": "North Carolina",
				"ND": "North Dakota",
				"NE": "Nebraska",
				"NH": "New Hampshire",
				"NJ": "New Jersey",
				"NM": "New Mexico",
				"NV": "Nevada",
				"NY": "New York",
				"OH": "Ohio",
				"OK": "Oklahoma",
				"OR": "Oregon",
				"PA": "Pennsylvania",
				"PR": "Puerto Rico",
				"PW": "Palau",
				"RI": "Rhode Island",
				"SC": "South Carolina",
				"SD": "South Dakota",
				"TN": "Tennessee",
				"TX": "Texas",
				"UT": "Utah",
				"VA": "Virginia",
				"VI": "Virgin Islands",
				"VT": "Vermont",
				"WA": "Washington",
				"WI": "Wisconsin",
				"WV": "West Virginia",
				"WY": "Wyoming"
			};
			Locale.zipPopover = {
				title: 'Find by Zip',
				trigger: 'click',
				template: '/core/ui-app-resource/tpl/locale-find-zip.html'
			};

			Locale.zipProgress = false;

			Locale.getParsed = function (str) {
				var ob = {
					state: '',
					city: '',
					zip: ''
				};

				if (!str) {
					return ob;
				}

				var sp = str.split(',');

				var stz = sp[1].split(' ');

				ob.city = $.trim(sp[0]);
				ob.state = $.trim(stz[1]);
				ob.zip = $.trim(stz[2]);

				return ob;
			};

			Locale.findByZip = function (callback) {
				if (!Locale.zipCode) {
					return;
				}
				Locale.zipProgress = true;

				restApi.get('/city/' + Locale.zipCode).success(function (e) {
					Locale.cities = Locale.zips = [];

					if (typeof callback === 'function') {

						callback.call(this, e, Locale.zipCode);
					}

					//Locale.zipCode='';
				})
					.error(function (err) {
						Locale.zipProgress = false;
						Toasty.error(err);
					});
			};

			Locale.preLoad = function (obj, callbackState, CallbackCity) {
				Locale.stateChanged(obj.state, callbackState);
				Locale.cityChanged(obj.state, obj.city, CallbackCity);
			};

			Locale.stateChanged = function (s, callback) {
				Locale.cities = [];
				Locale.zips = [];

				if (!s) {
					return;
				}

				restApi.get('/cities/' + s).success(function (e) {
					Locale.cities = e;

					if (typeof callback === 'function') {
						callback.call(this);
					}
				});
			};

			Locale.cityChanged = function (s, c, callback) {
				Locale.zips = [];

				if (!c) {
					return;
				}

				restApi.get('/zipcodes/' + s + '/' + c).success(function (e) {
					Locale.zips = e;

					if (typeof callback === 'function') {
						callback.call(this);
					}
				});
			};

			Locale.hidePopup = function (elem) {
				$(elem).popover('hide');
			};

			return Locale;
		};
	})

	.directive('statePicker', function (Locale) {
		return {
			restrict: 'AE',
			replace: 'true',
			scope: {
				container: '=',
				ngModel: "="
			},
			template: '<select name="" class="chosen-select" chosen data-placeholder="Choose a state" no-results-text="\'No state found\'" ng-options="k as v for (k,v) in container.states"><option value="">Choose a state</option></select>',

			link: function (scope, elem, attrs) {
				angular.element(elem).attr('name', scope.container.id + 'State');

				scope.$watch(function () {
					if (!scope.ngModel) {
						scope.container.cities = [];
						scope.container.zips = [];
					}
				});

				elem.bind('change', function () {
					scope.container.stateChanged(scope.ngModel);
				});
			}
		};
	})

	.directive('cityPicker', function (Locale) {
		return {
			restrict: 'AE',
			replace: 'true',
			scope: {
				container: '=',
				ngModel: "=",
				state: "="
			},
			template: '<select class="chosen-select" chosen data-placeholder="Choose a city" no-results-text="\'No city found\'" ng-options="o as o for o in container.cities"><option value="">Choose a city</option></select>',

			link: function (scope, elem, attrs) {
				angular.element(elem).attr('name', scope.container.id + 'City');
				scope.$watch(function () {
					if (!scope.ngModel) {
						scope.container.zips = [];
					}
				});

				elem.bind('change', function () {
					scope.container.cityChanged(scope.state, scope.ngModel);
				});
			}
		};
	})

	.directive('zipPicker', function (Locale) {
		return {
			restrict: 'AE',
			replace: 'true',
			scope: {
				container: '=',
				ngModel: "="
			},
			template: '<select class="chosen-select" chosen data-placeholder="Choose a zip" no-results-text="\'No zip found\'" ng-options="o as o for o in container.zips"><option value="">Choose a zip</option></select>',
			link: function (scope, elem, attrs) {
				angular.element(elem).attr('name', scope.container.id + 'Zip');
			}
		};
	})

	.directive('location', function (Locale) {
		return {
			restrict: 'AE',
			replace: 'true',
			scope: {
				container: '='
			},
			template: '<span></span>',
			link: function (scope, elem, attrs) {
				scope.$watch(function () {
					var str = '';

					if (typeof scope.container === 'string') {
						str = scope.container;
					}

					if (typeof scope.container === 'object') {
						str = scope.container.city + ', ' + scope.container.state + ' ' + scope.container.zip;
					}

					if (typeof scope.container === 'undefined') {
						str = 'N/A';
					}

					angular.element(elem).text(str);
				});
			}
		};
	})

	.directive('zipFinder', function ($compile, Locale) {
		var _template = '<div class="form-group"><label>Enter a Zip Code: <span ng-show="container.zipProgress"><i class="fa fa-refresh fa-spin"></i></span></label><div class="clearfix"></div>'
			+ '<input type="text" id="zipInput{{container.id}}" ng-disabled="container.zipProgress" maxlength="5" placeholder="5 digits code" ng-model="container.zipCode" class="form-control input-sm pull-left zipFinder input" style="width: 60%; margin-right:5px;">'
			+ '<button type="button" id="btnFind{{container.id}}" ng-disabled="container.zipProgress" class="btn btn-success btn-sm pull-left"> <i class="fa fa-search"></i> Find</button><div class="clearfix"></div></div>';

		return {
			restrict: 'AE',
			replace: 'true',
			scope: {
				container: '=',
				ngModel: "=",
				state: "=",
				city: "=",
				zip: "="
			},
			template: '<span class="zipFinderPopover"><i class="glyphicon glyphicon-search"></i>&nbsp;'
			+ '<a href="javascript:;" class="nolink">Find by Zip <span class="fa fa-caret-down"></span></a></span>',

			link: function (scope, elem, attrs) {
				var options = {
                    content: $compile(_template)(scope),
                    placement: "bottom",
                    html: true,
					animation: false,
					selector: ''
                };

				var Hover = function () {
					scope.container.zipProgress = false;

					angular.element('#btnFind' + scope.container.id).bind('click', function () {
						scope.container.findByZip(function (e, z) {
							scope.city = e.city;
							scope.state = e.state;
							scope.zip = z;
							scope.container.stateChanged(e.state, function () {
								scope.container.cityChanged(e.state, e.city, function () {
									scope.zip = z;
									scope.container.zipCode = '';
									scope.container.zipProgress = false;
									$(elem).popover('destroy');
								});
							});

						});
					});
				};


				elem.find('a').bind('click', function () {
					$(elem).popover(options);

					$(elem).on('shown.bs.popover', function () {
						$('#zipInput' + scope.container.id).focus();
						Hover()
					});
				});

				$(elem).on('shown.bs.popover', function () {
				});

				scope.$watch(function () {
					scope.container.zipCode = scope.container.zipCode.replace(/\D+/, '');
				});
			}
		};
	})

	.factory('Vehicles', function (restApi, $http, Toasty) {
		return function (id) {
			var veh = {
				types: [
					"Coupe",
					"Sedan Small",
					"Sedan Midsize",
					"Sedan Large",
					"Convertible",
					"Pickup Small",
					"Pickup Crew Cab",
					"Pickup Fullsize",
					"Pickup Extended Cab",
					"RV",
					"Dually",
					"SUV Small",
					"SUV Midsize",
					"SUV Large",
					"Travel Trailer",
					"Van Mini",
					"Van Fullsize",
					"Van Extended Length",
					"Van Poptop",
					"Motorcycle",
					"Boat",
					"Other"
				],

				makes: [
					"AC",
					"Acura",
					"Alfa Romeo",
					"Am General",
					"American Motors",
					"Aston Martin",
					"Auburn",
					"Audi",
					"Austin",
					"Austin-Healey",
					"Avanti Motors",
					"BMW",
					"Bentley",
					"Bugatti",
					"Buick",
					"Cadillac",
					"Checker",
					"Chevrolet",
					"Chrysler",
					"Daewoo",
					"Daihatsu",
					"Datsun",
					"DeTomaso",
					"Delahaye",
					"Delorean",
					"Dodge",
					"Eagle",
					"Edsel",
					"Essex",
					"Ferrari",
					"Fiat",
					"Fisker",
					"Ford",
					"Franklin",
					"GMC",
					"Geo",
					"Honda",
					"Hudson",
					"Hummer",
					"Hupmobile",
					"Hyundai",
					"Infiniti",
					"International",
					"Isuzu",
					"Jaguar",
					"Jeep",
					"Jensen",
					"Kaiser",
					"Kia",
					"Koenigsegg",
					"LaSalle",
					"Lamborghini",
					"Lancia",
					"Land Rover",
					"Lexus",
					"Lincoln",
					"Lotus",
					"MG",
					"MINI",
					"Maserati",
					"Maybach",
					"Mazda",
					"McLaren",
					"Mercedes-Benz",
					"Mercury",
					"Merkur",
					"Mitsubishi",
					"Morgan",
					"Morris",
					"Nash",
					"Nissan",
					"Oldsmobile",
					"Packard",
					"Panoz",
					"Peugeot",
					"Plymouth",
					"Pontiac",
					"Porsche",
					"Qvale",
					"RAM",
					"Renault",
					"Rolls-Royce",
					"Saab",
					"Saleen",
					"Saturn",
					"Scion",
					"Smart",
					"Spyker",
					"Sterling",
					"Studebaker",
					"Subaru",
					"Sunbeam",
					"Suzuki",
					"TVR",
					"Tesla",
					"Toyota",
					"Triumph",
					"Volkswagen",
					"Volvo",
					"Willys",
					"Yugo"
				],

				models: []
			};

			veh.year = 0;

			veh.id = (id || '');

			veh.fetchingModels = false;

			veh.makeChanged = function (s, callback) {
				veh.models = [];

				if (!s) {
					return;
				}

				veh.fetchingModels = true;

				restApi.get('/vehicle-models/' + s).success(function (e) {
					veh.fetchingModels = false;
					veh.models = e;

					if (typeof callback === 'function') {
						callback.call(this);
					}
				});
			};

			return veh;
		};
	})

	.directive('vehicleType', function () {
		return {
			restrict: 'AE',
			replace: 'true',
			scope: {
				container: '=',
				ngModel: "="
			},
			template: '<select class="chosen-select" chosen data-placeholder="Vehicle Type" no-results-text="\'No type found\'" required ng-options="o as o for o in container.types"><option value="">Choose Type</option></select>',
		};
	})

	.directive('vehicleMake', function () {
		return {
			restrict: 'AE',
			replace: 'true',
			scope: {
				container: '=',
				ngModel: "="
			},
			template: '<select class="chosen-select" chosen data-placeholder="Vehicle Type" no-results-text="\'No type found\'" required ng-options="o as o for o in container.makes"><option value="">Choose Make</option></select>',

			link: function (scope, elem, attrs) {
				scope.$watch(function () {
					if (!scope.ngModel) {
						scope.container.models = [];
					}
				});

				elem.bind('change', function () {
					scope.container.makeChanged(scope.ngModel);
				});
			}
		};
	})

	.directive('vehicleModel', function () {
		return {
			restrict: 'AE',
			replace: 'true',
			scope: {
				container: '=',
				ngModel: "="
			},
			template: '<select class="chosen-select" chosen data-placeholder="Vehicle Model" no-results-text="\'No type found\'" required ng-options="o as o for o in container.models"><option value="">Choose Model</option></select>',
		};
	})

	.directive('vehicleYear', function () {
		return {
			restrict: 'AE',
			replace: 'true',
			scope: {
				container: '=',
				ngModel: "="
			},
			template: '<input type="text" maxlength="4" class="form-control input-sm">',

			link: function (scope, elem, attrs) {

				var d = new Date();
				var n = Number(d.getFullYear());

				elem.bind('keydown keypress', function () {
					var yr = Number(angular.element(elem).val().replace(/\D+/, ''));
					angular.element(elem).val(yr);
				});

				angular.element(elem).attr('max', n);

				elem.bind('blur', function () {
					var yr = Number(angular.element(elem).val().replace(/\D+/, ''));


					if (yr < 1900) {
						angular.element(elem).val(1900);
					}

					if (yr > n) {
						angular.element(elem).val(n);
					}
				});
			}
		};
	})

	.directive('vehicle', function (Locale) {
		return {
			restrict: 'AE',
			replace: 'true',
			scope: {
				data: '='
			},
			template: '<span></span>',
			link: function (scope, elem, attrs) {
				scope.$watch(function () {
					var str = '';

					if (typeof scope.data === 'string') {
						str = scope.data;
					}

					if (typeof scope.data === 'object') {
						str = scope.data.make + ' ' + scope.data.model + ' ' + scope.data.year;
					}

					if (typeof scope.data === 'undefined') {
						str = 'N/A';
					}

					angular.element(elem).text(str);
				});
			}
		};
	})
	;
