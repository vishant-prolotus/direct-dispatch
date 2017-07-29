angular.module('ddVehiclePicker', ['ui.select', 'ngSanitize'])
    .directive('ddVehiclePicker', function ($http) {
        var template = '<ui-select ng-model="$parent.ngModel" reset-search-input="false" required\
                        on-select="onSelect($item, $model)" ui-select-open-on="{{openOn}}">\
                        <ui-select-match placeholder="Type model or make">\
                            {{$select.selected.make}} {{$select.selected.model}}\
                        </ui-select-match>\
                        <ui-select-choices repeat="vehicle in (vehicles) track by $index"\
                        refresh="searchVehicle($select.search)"\
                        refresh-delay="250">\
                            {{vehicle.make}} {{vehicle.model}}\
                        </ui-select-choices>\
                    </ui-select>';
        var link = function (scope) {
            scope.searchVehicle = function (query) {
                if (query.length < 3) return;
                var url = '/api/vehicle-search/' + query + '/50';
                return $http.get(url).then(function (response) {
                    scope.vehicles = response.data;
                });
            };
        };
        return {
            restrict: 'E',
            scope: {
                ngModel: '=',
                onSelect: '=',
                openOn: '='
            },
            template: template,
            link: link
        };
    });