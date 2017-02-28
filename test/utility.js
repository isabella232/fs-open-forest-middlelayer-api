/*

  ___ ___       ___               _ _       _   ___ ___ 
 | __/ __|  ___| _ \___ _ _ _ __ (_) |_    /_\ | _ \_ _|
 | _|\__ \ / -_)  _/ -_) '_| '  \| |  _|  / _ \|  _/| | 
 |_| |___/ \___|_| \___|_| |_|_|_|_|\__| /_/ \_\_| |___|

*/

//*******************************************************************

'use strict';

//*******************************************************************

function update_input_data(base_data, update){
	
	var updated_input = Object.assign(
		{},
		base_data,
    	update
	);
	
	return updated_input;
}

//*******************************************************************
// exports

module.exports.update_input_data = update_input_data;