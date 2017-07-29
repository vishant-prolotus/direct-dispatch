angular.module('ddDeliveryTime', [])
    .factory('ddDeliveryTime', function () {
        return function (distance) {
            if (distance <= 200)
                return '1-2';
            if (distance > 201 && distance <= 600)
                return '2-4';
            if (distance > 601 && distance <= 1000)
                return '3-5';
            if (distance > 1001 && distance <= 1500)
                return '4-6';
            if (distance > 1501 && distance <= 2000)
                return '5-7';
            if (distance > 2001 && distance <= 2400)
                return '6-8';
            if (distance > 2400)
                return '7-9';
        };
    });