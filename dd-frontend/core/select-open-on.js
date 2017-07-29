angular.module('selectOpenOn', [])
.directive('selectOpenOn', function ($http) {    
    var link = function (scope, element, attrs) {
        if (!attrs.id) throw 'Element Id required for using select-open-on';
        scope.$on(attrs.selectOpenOn, function () {
            console.log('Invoked', attrs.selectOpenOn);
            var elem = document.getElementById(attrs.id);
            var event = new MouseEvent('mousedown');
            elem.dispatchEvent(event);
        });
    };
    return {
        restrict: 'A',
        require: 'select',
        link: link
    };
});