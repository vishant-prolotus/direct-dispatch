var http = require ('http');         // For serving a basic web page.
var mongoose = require ("mongoose"); 
 mongoose.connect('mongodb://localhost:27017/direct-dispatch', function (err, res) {
      if (err) {
      console.log ('ERROR connecting to: ' + 'http://localhost:27017/direct-dispatch' + '. ' + err);
      } else {
      console.log ('Succeeded connected to: ' + 'http://localhost:27017/direct-dispatch');
      }
    });

     var userSchema = new mongoose.Schema({
      name: String,
      icon: String,
      color: String,
      reports:[{
          id:Number,
          icon:String,
          title:String,
          description:String
      }] 
    });

    var PUser = mongoose.model('PowerUsers', userSchema);
    module.exports = PUser;