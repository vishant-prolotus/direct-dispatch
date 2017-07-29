angular.module('ddRegionPicker', ['ui.select', 'ngSanitize'])
    .directive('ddRegionPicker', function ($http) {
        var template = '<ui-select ng-model="$parent.ngModel" reset-search-input="false" required\
                     on-select="onSelect($item, $model)" ui-select-open-on="{{openOn}}">\
                        <ui-select-match placeholder="Select region">\
                            {{$select.selected.title}}\
                        </ui-select-match>\
                        <ui-select-choices repeat="region in (regions | filter: $select.search) track by $index">\
                            {{region.title}}\
                        </ui-select-choices>\
                    </ui-select>';
        var link = function (scope) {
            scope.regions = [{ name: "Northeast", title: "Northeast - ME,VT,NH,MA,RI,CT,NY,NJ,PA,DE" },
                { name: "Southeast", title: "Southeast - MD,DC,VA,WV,KY,TN,NC,SC,AL,GA,FL" },
                { name: "Midwest/Plains", title: "Midwest/Plains - OH,IN,IL,MO,KS,WI,MI,MN,IA,NE,SD,ND" },
                { name: "South", title: "South - TX,OK,AR,LA,MS" },
                { name: "Northwest", title: "Northwest - WA,OR,ID,MT,WY" },
                { name: "Southwest", title: "Southwest - CA,NV,UT,AZ,CO,NM" },
                { name: "Pacific", title: "Pacific - AK,HI" }];
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