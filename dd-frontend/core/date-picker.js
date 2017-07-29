angular.module('datePicker', [])
.directive('datePicker', function() {
    return {
        require: '?ngModel',
        restrict: 'A',
        scope: {
            options: '=datePicker',
            //change: '='
        },
        link: function(scope, elem, attr, model) {
            elem.datepicker(scope.options);
            if (!model) return;
            model.$render = function() {
                if (scope.options.multidate) {
                    elem.datepicker('setDates', model.$viewValue.split(', '));
                } else {
                    elem.datepicker('update', model.$viewValue);
                }
            };
            elem.datepicker().on('changeDate', function(e) {
                if (scope.options.multidate) {
                    var datesStr = e.dates.map(function(d, i) {
                        return e.format(i);
                    }).join(', ');
                    model.$setViewValue(datesStr);
                } else {
                    model.$setViewValue(e.format());
                }
            });
        }
    };
});