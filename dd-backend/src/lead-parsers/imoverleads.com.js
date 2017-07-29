
/**
 * Convert Raw text to Lead Object
 * @author Junaid Atari <mj.atari@gmail.com>
 * @param {String} str Text to be converted
 * @returns {Object} Lead Object
 */
exports.parse = function ( str )
{
	// Null = skipped property
	var leadObject = {
		carrierType : 'Open',
		email : "",
		notes : [],
		origin : {},
                destination : {},
		vehicles : [{
			"price" : 0
		}]
	};

	lines = str.replace(/\n+/g ,"\n").split("\n");
	
	var _des = _org = 0;
	 
	for ( i = 0; i < lines.length; i++ )
	{
		if ( !(txt = lines[i].trim()) || !( data = txt.split(':') ).length )
		{
			continue;
		}

		key = data[0].trim().toLowerCase();
		value = data[1].trim();

		delete data;
		
		if ( key.indexOf('destination') !==-1 )
		{
			leadObject.destination.push( value + (_des === 1 ? ',' : '') );
			_des += 1;
			
			continue;
		}
		
		if ( key.indexOf('origin') !==-1 )
		{
			_org += 1;
			
			leadObject.origin.push(value + (_org === 2 ? ',' : ''));
			continue;
		}

		if ( key.indexOf('customer') !==-1 )
		{
			leadObject[key.replace('customer', '').trim()] = value;
			continue;
		}
		 
		if ( key.indexOf('vehicle') !==-1 )
		{ 
			leadObject.vehicles[0][ key.replace('vehicle', '').trim() ] = value;
			continue;
		}
		
		if ( key.indexOf('comments') !==-1 )
		{
			var obj = [];
			
			obj['contents'] = value;
			obj['created'] = new Date();
			
			leadObject.notes.push(obj);
		}
	}
	
	leadObject.destination = leadObject.destination.join(' ');
	leadObject.origin = leadObject.origin.join(' ');
	
	return leadObject;
};