angular.module('ddVehicleTypePicker', ['ui.select', 'ngSanitize'])
    .directive('ddVehicleTypePicker', function ($http) {
        var template = '<ui-select ng-model="$parent.ngModel" reset-search-input="false" required\
                        on-select="onSelect($item, $model)" ui-select-open-on="{{openOn}}">\
                            <ui-select-match placeholder="Select vehicle type">\
                                {{$select.selected}}\
                            </ui-select-match>\
                            <ui-select-choices repeat="type in (types | filter: $select.search) track by $index">\
                                {{type}}\
                            </ui-select-choices>\
                        </ui-select>';
        var link = function (scope) {
            scope.types = [
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
            ];
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