angular.module('ddCityPicker', ['ui.select', 'ngSanitize'])
.directive('ddCityPicker', function ($http) {    
    var template = '<ui-select ng-model="$parent.ngModel" reset-search-input="false" required\
                     on-select="onSelect($item, $model)" ui-select-open-on="{{openOn}}">\
                        <ui-select-match placeholder="{{placeholder}}">\
                            {{$select.selected.city}}, {{$select.selected.state}}<span ng-if="!noZip"> {{$select.selected.zip}}</span>\
                        </ui-select-match>\
                        <ui-select-choices repeat="city in cities track by $index"\
                        refresh="searchCity($select.search)"\
                        refresh-delay="250">\
                            {{city.city}}, {{city.state}}<span ng-if="!noZip">  {{city.zip}}</span>\
                        </ui-select-choices>\
                    </ui-select>';
    var link = function (scope) {
        scope.placeholder = 'Type city';
        if (!scope.noZip) scope.placeholder += ' or zip';
        scope.searchCity = function (query) {
            if (query.length < 3) return;
            var url = '/api/city-search/' + query + '/50';
            debugger;
            if (scope.noZip) url += '?nozip=true';
            return $http.get(url).then(function (response) {
                debugger;
                scope.cities = response.data;
            });
        };
    };
    return {
        restrict: 'E',
        scope: {
            ngModel: '=',
            onSelect: '=',
            openOn: '=',
            noZip: '='
        },
        template: template,
        link: link
    };
});