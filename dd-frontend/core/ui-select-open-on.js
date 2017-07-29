angular.module('ui.select').directive('uiSelectOpenOn', function () {
    return {
        restrict: 'A',
        require: 'uiSelect',
        link: function (scope, element, attrs, uiSelect) {
            scope.$on(attrs.uiSelectOpenOn, function () {
                uiSelect.setFocus();
                uiSelect.activate();
            });
        }
    };
});