var express = require('express');			 	// menggunakan library express untuk web service http
var app = express();						 	// memanggil library express
var bodyParser = require('body-parser');		// menggunakan library body parser untuk mendapatkan data dari client
var multer = require('multer');					// menggunakan library multer untuk multipart (form-data)
var upload = multer();							// definisi penggunaan library multer
var server = require('http').createServer(app);	// menggunakan library http untuk mengawasi port server di library socket.io
var mongodb   = require('mongodb').MongoClient; // menggunakan library mongodb sebagai mongodb client
var ObjectId = require('mongodb').ObjectId;		// untuk memanggil primary key (id)
var io = require('socket.io').listen(server);	// menggunakan library socket.io untuk realtime socket
var db;
var port = process.env.PORT || 3000;

var url = 'mongodb://localhost:27017/find-my-team';
mongodb.connect(url, function(err, dbase){
  	console.log("Connected successfully to server");
  	db = dbase;
});

//=============Setting app untuk express============
app.use(bodyParser.json());							//parsing app json
app.use(bodyParser.urlencoded({ extended: true })); //parsing x-form-url

// ===========ROUTING=============

app.post('/register', upload.array(), function(req,res,next){
	var collection = db.collection('users');
	collection.findOne({email:req.body.email}, function(err, result){
		if(result == null){
			collection.insertOne({firstname:req.body.firstname,lastname:req.body.lastname,email:req.body.email,password:req.body.password, skill_id:req.body.skill_id, role:1}, function(err, docs){
				var response = {
					success:true,
					message:"Data berhasil di daftarkan"
				}
				res.json(response);
			})
		}else{
			var response = {
				success:false,
				message:"Email sudah terdaftar"
			}
			res.json(response);
		}
	});
});

app.post('/login',upload.array(), function(req, res, next){
	var response = {};
	var collection = db.collection('users');
	collection.findOne({email:req.body.email}, function(err, result){
		if(result != null){
			if(result.password == req.body.password){
				response.success = true;
				response.message = 'Berhasil login';
				response.data = result;
				res.json(response);
			}else{
				response.success = false;
				response.message = 'Mohon maaf password yang Anda masukkan salah !';
				response.data = null;
				res.json(response);
			}
		}else{
			response.success = false;
			response.message = 'Mohon maaf email yang Anda masukkan tidak terdaftar !';
			response.data = null;
			res.json(response);
		}
	});
});


//mendefinisikan variabel api untuk routing pada /api
var api = express.Router();

api.use(function(req,res,next){
	var collection = db.collection('users');
	console.log('aman cuy');
	next();
	// console.log();
});

api.get('/', upload.array(), function(req, res){
	var data = {};
	data.isi = req.headers;
	res.json(data);
});

//MENDEFINISIKAN ROUTING PREFIX pada alamat / address http untuk /api
app.use('/api', api);

server.listen(port);
console.log('port connect in '+port);