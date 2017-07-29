angular.module('select2', [])
.directive('select2', function() {
    return {
    	require: '?ngModel',
        restrict: 'A',
        scope: {
        	options: '=select2'
        },
        link: function (scope, elem, attr, model) {
            elem.select2(scope.options);
   			if (!model) return;
			scope.$parent.$watch(attr.ngModel, function (value) {
				elem.select2('val', value);
			});
			elem.on('change', function (e) {
				scope.$apply(function () {
				  model.$setViewValue(e.val);
				});
			});
        }
    };
})
//.directive('chosen', function($console) {
//  var linker = function(scope, element, attr) 
//	{
//        // update the select when data is loaded
//        scope.$watch(attr.chosen, function(oldVal, newVal)
//		{
//            element.trigger('chosen:updated');
//        });
//
//        // update the select when the model changes
//        scope.$watch(attr.ngModel, function() {
//            element.trigger('chosen:updated');
//        });
//        
//        element.chosen({'min-width': "95%"});
//        element.trigger('chosen:updated');
//    };
//
//    return {
//        restrict: 'A',
//        link: linker
//    };
//});
