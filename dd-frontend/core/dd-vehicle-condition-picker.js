angular.module('ddVehicleConditionPicker', ['ui.select', 'ngSanitize'])
    .directive('ddVehicleConditionPicker', function ($http) {
        var template = '<ui-select ng-model="$parent.ngModel" reset-search-input="false" required\
                        on-select="onSelect($item, $model)" ui-select-open-on="{{openOn}}">\
                            <ui-select-match placeholder="Select vehicle condition">\
                                {{$select.selected}}\
                            </ui-select-match>\
                            <ui-select-choices repeat="type in (types | filter: $select.search) track by $index">\
                                {{type}}\
                            </ui-select-choices>\
                        </ui-select>';
        var link = function (scope) {
            scope.types = ['Running', 'Not Running'];
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