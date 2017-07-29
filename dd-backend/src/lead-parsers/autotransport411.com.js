
exports.parse = function (str)
{
    // Null = skipped property
    var leadObject = {
        name: "",
        email: "",
        phone: "",
        origin: {},
        destination: {},
        carrierType: "",
        vehicles: [],
        notes: []
    };

    var _vehicle = function () {
        return {
            make: "",
            model: "",
            year: "",
            condition: "",
            type: ""
        };
    };


    var _trim = function (str) {
        return str.replace(/^\s+/, '').replace(/\s+$/, '');
    };

    var _properCase = function (str) {
        return str.replace(/\w\S*/g, function (txt) {
            return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
        });
    };

    var _addVehicle = function (k, v, id)
    {
        // Vehicle 1 : Type
        if (key.indexOf('type') !== -1)
        {
            return leadObject.vehicles[id].type = value;
        }

        // Vehicle 1 : Condition
        if (key.indexOf('condition') !== -1)
        {
            return leadObject.vehicles[id].condition = value.toLowerCase() === 'running'
                    ? 'Running'
                    : 'Not Running';
        }

        // Vehicle : Make and Model
        if (key.indexOf('make') !== -1)
        {
            return leadObject.vehicles[id].make = _trim(value);
        }
        
        if (key.indexOf('model') !== -1)
        {
            return leadObject.vehicles[id].model = _trim(value);
        }
        
        if (key.indexOf('year') !== -1)
        {
            return leadObject.vehicles[id].year = _trim(value);
        }

        return;
    };

    lines = _trim(str).replace(/\n+/g, "\n").split("\n");
    var originCity, originState, originZip;
    var destinationCity, destinationState, destinationZip;

    for (i = 0; i < lines.length; i++)
    {
        if (!(txt = _trim(lines[i])) || (data = txt.split(':')).length < 2 || !(_trim(data[1])))
        {
            continue;
        }

        key = data[0].trim().toLowerCase();
        value = data[1].trim();

        delete txt, data;

        // Customer name
        if (key.indexOf('name') !== -1)
        {
            leadObject.name = _trim(value + ' ' + leadObject.name);
            continue;
        }

        // Email
        if (key.indexOf('email') !== -1)
        {
            leadObject.email = value;
            continue;
        }

        // Phone Number
        if (key.indexOf('phone') !== -1)
        {
            leadObject.phone = value.replace(/\D+/g, '');
            continue;
        }

        // Origin City
        if (key.indexOf('origin city') !== -1)
        {
            originCity = _properCase(value);
            continue;
        }

        // Origin State
        if (key.indexOf('origin state') !== -1)
        {
            originState = value && value.toUpperCase();
            continue;
        }

        // Origin Zip
        if (key.indexOf('origin zip') !== -1)
        {
            originZip = value;
            continue;
        }

        // Destination City
        if (key.indexOf('destination city') !== -1)
        {
            destinationCity = _properCase(value);
            continue;
        }

        // Destination State
        if (key.indexOf('destination state') !== -1)
        {
            destinationState = value && value.toUpperCase();
            continue;
        }

        // Destination Zip
        if (key.indexOf('destination zip') !== -1)
        {
            destinationZip = value;
            continue;
        }

        // Notes
        if (key.indexOf('comments') !== -1)
        {
            var obj = [];

            obj['contents'] = value;
            obj['created'] = new Date();

            leadObject.notes.push(obj);
        }

        // Type of Carrier
        if (key.indexOf('vehicle') === -1 && key.indexOf('carrier') !== -1)
        {
            leadObject.carrierType = value.toLowerCase() === 'open'
                    ? 'Open'
                    : 'Enclosed';
            continue;
        }

        // Vehicle 2,3,4 Section
        if (key.indexOf('vehicle') !== -1 && key.indexOf('#') !== -1)
        {
            idx = Number(key.replace(/\D+/g, '')) - 1;

            if (typeof (leadObject.vehicles[idx]) === 'undefined')
            {
                leadObject.vehicles[idx] = _vehicle();
            }

            _addVehicle(key, value, idx);

            continue;
        }

        // Vehicle 1 : Type
        if (key.indexOf('type') !== -1 || key.indexOf('condition') !== -1 || key.indexOf('model') !== -1 || key.indexOf('make') !== -1 || key.indexOf('year') !== -1)
        {
            if (typeof (leadObject.vehicles[0]) === 'undefined')
            {
                leadObject.vehicles[0] = _vehicle();
            }

            _addVehicle(key, value, 0);
        }
    }

    leadObject.origin = { city: originCity, state: originState, zip: originZip };
    leadObject.destination = { city: destinationCity, state: destinationState, zip: destinationZip };

    // fix vehicle types

    leadObject.vehicles.forEach(function (vehicle) {
        switch (vehicle.type) {
            case 'Pickup Full-Size':
                vehicle.type = 'Pickup Fullsize';
                break;
            case 'Pickup Extd. Cab':
                vehicle.type = 'Pickup Extended Cab';
                break;
            case 'SUV Mid-size':
                vehicle.type = 'SUV Midsize';
                break;
            case 'Van Full-Size':
                vehicle.type = 'Van Fullsize';
                break;
            case 'Van Extd. Length':
                vehicle.type = 'Van Extended Length';
                break;
            case 'Van Pop-Top':
                vehicle.type = 'Van Poptop';
                break;
        }
    });

    return leadObject;
};