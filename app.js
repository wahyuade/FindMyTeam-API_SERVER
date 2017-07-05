var express = require('express');			 	// menggunakan library express untuk web service http
var app = express();						 	// memanggil library express
var bodyParser = require('body-parser');		// menggunakan library body parser untuk mendapatkan data dari client
var multer = require('multer');					// menggunakan library multer untuk multipart (form-data)
var server = require('http').createServer(app);	// menggunakan library http untuk mengawasi port server di library socket.io
var mongodb   = require('mongodb').MongoClient; // menggunakan library mongodb sebagai mongodb client
var ObjectId = require('mongodb').ObjectId;		// untuk memanggil primary key (id)
var io = require('socket.io').listen(server);	// menggunakan library socket.io untuk realtime socket
var db;
var port = process.env.PORT || 3000;

var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
  		var name = Math.random().toString(32).slice(2)
    	cb(null, name+file.originalname);
  }
});
var upload = multer({ storage: storage });

var url = 'mongodb://localhost:27017/find-my-team';
mongodb.connect(url, function(err, dbase){
  	console.log("Connected successfully to server");
  	db = dbase;
});

//=============Setting app untuk express============
app.use(bodyParser.urlencoded({ extended: true })); //parsing x-form-url
app.use(bodyParser.json());							//parsing app json

// ===========ROUTING=============

app.post('/register', upload.array(), function(req,res,next){
	var collection = db.collection('users');
	collection.findOne({email:req.body.email}, function(err, result){
		if(result == null){
			var x_api_key = Math.random().toString(32).slice(2)+Math.random().toString(32).slice(2)+Math.random().toString(32).slice(2);
			collection.insertOne({firstname:req.body.firstname,lastname:req.body.lastname,email:req.body.email,password:req.body.password, skill_id:req.body.skill_id, role:1, x_api_key:x_api_key}, function(err, docs){
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


//mendefinisikan variabel api_user untuk routing pada /api_user
var api_user = express.Router();

api_user.use(function(req,res,next){
	var collection = db.collection('users');
	console.log('aman cuy');
	next();
	// console.log();
});

api_user.get('/', upload.array(), function(req, res){
	var data = {};
	data.isi = req.headers;
	res.json(data);
});

//MENDEFINISIKAN ROUTING PREFIX pada alamat / address http untuk /api_user
app.use('/api_user', api_user);

//mendefinisikan variabel api_user untuk routing pada /api_user
var api_admin = express.Router();

api_admin.use(function(req,res,next){
	var collection = db.collection('users');
	collection.findOne({x_api_key:req.headers.x_api_key}, function(err, result){
		if(result != null){
			if(result.role == 0){
				next();
			}
			else{
				res.json({status:'Unauthorized'});
			}

		}
	});
});

api_admin.get('/', upload.array(), function(req, res){
	var data = {};
	data.isi = req.headers;
	res.json(data);
});

api_admin.post('/upload_competition', upload.array('foto', 12), function(req,res,next){
	var data_competition = {};
	var collection = db.collection('competitions');
	data_competition = req.body;
	data_competition.foto = req.files[0].filename;
	collection.insertOne(data_competition, function(err, result){
		res.json(data_competition);
	})
});

api_admin.get('/list_competition', function(req, res){
	var collection = db.collection('competitions');
	collection.find({}).toArray(function(err, result){
		res.json(result);
	});
});

api_admin.get('/detail_competition', function(req, res){
	var collection = db.collection('competitions');
	collection.findOne(ObjectId(req.query._id), function(err, result){
		res.json(result);
	});
});

api_admin.delete('/delete_competition', function(req, res){
	var collection = db.collection('competitions');
	collection.removeOne({_id:ObjectId(req.query._id)}, function(err, result){
		res.json(result);
	})
})

//MENDEFINISIKAN ROUTING PREFIX pada alamat / address http untuk /api_user
app.use('/api_admin', api_admin);
app.use(express.static('uploads'));

server.listen(port);
console.log('port connect in '+port);