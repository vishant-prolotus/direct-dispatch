angular.module('ddPricing', [])
    .factory('ddPricing', function () {
        return {
            getVehiclePrice: function (vehicle, excludeFee) {
                var price = vehicle.price;
                if (!excludeFee) price += vehicle.fee || 0;
                return price;
            },
            getTotalPrice: function (vehicles, packagePrice, excludeFees) {
                var total = _.sum(vehicles.map(function (v) { return v.price; }));
                if (!excludeFees) {
                    total += _.sum(vehicles.map(function (v) { return v.fee || 0; }));
                }
                return total + (packagePrice || 0);
            },
            getTotalFee: function (vehicles) {
                return _.sum(vehicles.map(function (v) { return v.fee || 0; }));
            },
            calculateFee: function (price) {
                var fee = Math.round(9 / 100 * price);
                if (fee < 45) fee = 45;
                return fee;
            },
            packagePrices: { 'Standard': 0, 'Expedited': 50, 'Rush': 100 }
        };
    });