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
  		var name = Math.random().toString(32).slice(2);
    	cb(null, name+file.originalname);
  }
});
var upload = multer({ storage: storage });

var url = 'mongodb://localhost:27017/find-my-team';
// var url = 'mongodb://wahyuade:bismillah@ds147052.mlab.com:47052/web-soal';
mongodb.connect(url, function(err, dbase){
  	console.log("Connected successfully to server");
  	db = dbase;
});

//=============Setting app untuk express============
app.use(bodyParser.urlencoded({ extended: true })); //parsing x-form-url
app.use(bodyParser.json());							//parsing app json

// ===========ROUTING=============
app.get('/', function(req, res){
	res.json({message:'hello world'});
});

app.post('/register', upload.array(), function(req,res,next){
	var collection = db.collection('users');
	collection.findOne({email:req.body.email}, function(err, result){
		if(result == null){
			var x_api_key = Math.random().toString(32).slice(2)+Math.random().toString(32).slice(2)+Math.random().toString(32).slice(2);
			collection.insertOne({firstname:req.body.firstname,lastname:req.body.lastname,email:req.body.email,password:req.body.password, user_foto:x_api_key+'.jpg', role:1, x_api_key:x_api_key}, function(err, docs){
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
				response.data.user_foto = result.x_api_key+".jpg";
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
	collection.findOne({x_api_key:req.headers.x_api_key}, function(err, result){
		if(result != null){
			if(result.role == 1){
				next();
			}
			else{
				res.json({status:'Unauthorized'});
			}
		}else{
			res.json({status:'Unauthorized'});
		}
	});
});

api_user.get('/list_competition', function(req, res){
	var collection = db.collection('competitions');
	var i;
	collection.find({}).toArray(function(err, result){
		for(i=0;i<result.length;i++){
			if(result[i].comments != undefined)
				result[i].comments = result[i].comments.length;
			else{
				result[i].comments = 0;
			}

			if(result[i].ideas != undefined)
				result[i].ideas = result[i].ideas.length;
			else{
				result[i].ideas = 0;
			}			
			if(result[i].joined_team != undefined)
				result[i].joined_team = result[i].joined_team.length;
			else{
				result[i].joined_team = 0;
			}
		}
		res.json(result);
	});
});

api_user.get('/detail_competition', function(req, res){
	var collection = db.collection('competitions');
	collection.findOne(ObjectId(req.query._id), function(err, result){
		if(result.comments != undefined && result.ideas != undefined && result.joined_team != undefined){
			res.json(result);
		}else{
			if(result.comments == null){
				result.comments = new Array();;
			}if(result.ideas == null){
				result.ideas = new Array();
			}if(result.joined_team == null){
				result.joined_team = new Array();
			}
			res.json(result)
;		}
	});
});

api_user.post('/post_comment',upload.array(), function(req, res){
	var collection = db.collection('competitions');
	var user = db.collection('users');
	var _id_comment = Math.random().toString(32).slice(2);
	var comment_data;
	user.findOne({x_api_key:req.headers.x_api_key}, function(err, user){
		comment_data = {
			_id_comment:_id_comment,
			firstname:user.firstname+' '+user.lastname,
			comment:req.body.comment,
			date:Date.now(),
			user_foto:req.headers.x_api_key+'.jpg'
		}
		collection.updateOne({_id:ObjectId(req.body._id_competition)}, {$push : 
			{ 
				comments:comment_data
			}}, function(err, result){
				res.json(comment_data);
		});
	});
});

api_user.post('/create_team', upload.array('team_foto', 12), function(req, res){
	var collection = db.collection('teams');
	var user = db.collection('users');
	var data_team = {}
	user.findOne({x_api_key:req.headers.x_api_key}, function(err, user){
		data_team={
			team_name:req.body.team_name,
			team_foto:req.files[0].filename,
			admin:user.firstname+" "+user.lastname,
			max_member:req.body.max_member,
			member:[{
				_id_user:req.headers.x_api_key,
				name:user.firstname+" "+user.lastname,
				user_foto:req.headers.x_api_key+".jpg",
				role:0,
				status:1
			}]
		}
		collection.insertOne(data_team, function(err, result){	
			res.json(data_team);
		});
	});
});

api_user.delete('/delete_team', function(req, res){
	var team = db.collection('teams');
	team.findOne({_id:ObjectId(req.query._id_team)},{member:1},function(err, result){
		if(result.member[0]._id_user == req.headers.x_api_key){
			team.removeOne({_id:ObjectId(req.query._id_team)}, function(err, hasil){
				var response = {}
				response.success = true;
				response.message = "Berhasil menghapus team";
				res.json(response);
			});
		}
	})
});

api_user.delete('/exit_team', function(req, res){
	var team = db.collection('teams');
	team.findOne({_id:ObjectId(req.query._id_team)},{member:1},function(err, result){
		if(result.member[0]._id_user != req.headers.x_api_key){
			team.updateOne({_id:ObjectId(req.query._id_team)},{$pull:{
				member:{_id_user:req.headers.x_api_key}
			}} ,function(err, hasil){
				var response = {}
				response.success = true;
				response.message = "Berhasil keluar dari team";
				res.json(response);
			});
		}
	})
});

api_user.get('/list_my_team', function(req,res){
	var collection = db.collection('teams');
	var user = db.collection('users');
	var response = new Array();
	var i;
	collection.find({member:{$elemMatch:{_id_user:req.headers.x_api_key}}}, {chat:0}).toArray(function(err, result){
		res.json(result);
	});
});

api_user.get('/detail_team', function(req, res){
	var collection = db.collection('teams');
	collection.findOne(ObjectId(req.query._id), function(err, result){
		if(result.chat != null){
			res.json(result);
		}else{
			result.chat = new Array();
			res.json(result);
		}
	});
});
api_user.get('/list_user', function(req, res){
	var collection = db.collection('users');
	var i;
	if(req.query.skill_id==0){
		collection.find({role:1}, {firstname:1, lastname:1, desription:1,skill_id:1, x_api_key:1}).toArray(function(err, result){
			for(i=0;i<result.length;i++){
				switch(result[i].skill_id){
					case "1":
						result[i].skill_id = "Design";
					break;
					case "2":
						result[i].skill_id = "Front End Developer";
					break;
					case "3":
						result[i].skill_id = "Back End Developer";
					break;
					case "4":
						result[i].skill_id = "Project Manager";
					break;
					case "5":
						result[i].skill_id = "Networking";
					break;
					default:
						result[i].skill_id = "Unknown";
					break;
				}
			}
			res.json(result);
		})
	}else{
		collection.find({skill_id:req.query.skill_id, role:1}, {firstname:1, lastname:1, desription:1, skill_id:1, x_api_key:1}).toArray(function(err, result){
			for(i=0;i<result.length;i++){
				switch(result[i].skill_id){
					case "1":
						result[i].skill_id = "Design";
					break;
					case "2":
						result[i].skill_id = "Front End Developer";
					break;
					case "3":
						result[i].skill_id = "Back End Developer";
					break;
					case "4":
						result[i].skill_id = "Project Manager";
					break;
					case "5":
						result[i].skill_id = "Networking";
					break;
					default:
						result[i].skill_id = "Unknown";
					break;
				}
			}
			res.json(result);
		});
	}
});

api_user.get('/detail_user', function(req, res){
	var collection = db.collection('users');
	collection.findOne(ObjectId(req.query._id),{role:0, password:0}, function(err, result){
		switch(result.skill_id){
			case "1":
				result.skill_id = "Design";
			break;
			case "2":
				result.skill_id = "Front End Developer";
			break;
			case "3":
				result.skill_id = "Back End Developer";
			break;
			case "4":
				result.skill_id = "Project Manager";
			break;
			case "5":
				result.skill_id = "Networking";
			break;
			default:
				result.skill_id = "Unknown";
			break;
		}
		res.json(result);
	});
});

api_user.post('/group_chat', upload.array(), function(req, res){
	var collection = db.collection('teams');
	var user = db.collection('users');
	var chat_data = {}

	user.findOne({x_api_key:req.headers.x_api_key}, function(err, user){
		chat_data = {
				_id_user:req.headers.x_api_key,
				name:user.firstname+" "+user.lastname,
				user_foto:req.headers.x_api_key+".jpg",
				message:req.body.message,
				date:Date.now()
			}
		collection.updateOne({_id:ObjectId(req.body._id_team)}, {$push:{
			chat:chat_data
		}}, function(err, result){
			res.json(chat_data);
		});
	});
});

api_user.post('/register_my_team', upload.array(), function(req, res){
	var comp = db.collection('competitions');
	var team = db.collection('teams');
	var check = db.collection('competitions');
	var response = {};
	
	check.findOne({joined_team:{$elemMatch:{_id:ObjectId(req.body._id_team)}}, _id:ObjectId(req.body._id_competition)},{joined_team:1}, function(err, hasil){
		if(hasil!=null){
			response.success=false;
			response.message="Mohon maaf, team Anda sudah tergabung di event ini";
			res.json(response);
		}else{
			team.findOne(ObjectId(req.body._id_team),{member:0, chat:0}, function(err, data_team){
				comp.updateOne({_id:ObjectId(req.body._id_competition)}, {$push:{
					joined_team:{
						_id:data_team._id,
						team_name:data_team.team_name,
						team_foto:data_team.team_foto
					}
				}}, function(err, result){
					response.success=true;
					response.message="Selamat, team Anda berhasil ikut dalam event ini";
					res.json(response);
				});
			});
		}
	});

});

api_user.get('/my_joined_competition', function(req, res){
	var comp = db.collection('competitions');
	var team = db.collection('teams');
	comp.find({}, {comments:0}).toArray(function(err, data_comp){
		team.find({member:{$elemMatch:{_id_user:req.headers.x_api_key}}}).toArray(function(err, data_team){
			var i,j;
			var response = new Array();
			var my_join_comp = new Array();
			for(i=0;i<data_comp.length;i++){
				for(j=0;j<data_comp[i].joined_team.length;j++){
					data_comp[i].joined_team[j].id_comp = i;
					response.push(data_comp[i].joined_team[j]);
				}
			}

			for(i=0;i<response.length;i++){
				for(j=0;j<data_team.length;j++){
					if(response[i].team_foto==data_team[j].team_foto){
						my_join_comp.push(data_comp[response[i].id_comp]);
					}
				}
			}
			res.json(my_join_comp);
		});
	});
});

api_user.post('/join_team_to_member', upload.array(), function(req, res){
	var check = db.collection('teams');
	var team = db.collection('teams');
	var user = db.collection('users');
	var response = {};
	check.findOne({_id:ObjectId(req.body._id_team), member:{$elemMatch:{_id_user:req.headers.x_api_key}}}, function(err, result){
		if(result==null){
			user.findOne({x_api_key:req.headers.x_api_key}, function(err, data_user){
				var post_user = {};
				post_user._id_user = req.headers.x_api_key;
				post_user.name = data_user.firstname +" "+ data_user.lastname;
				post_user.user_foto = req.headers.x_api_key+".jpg";
				post_user.status = 0;
				post_user.role = 1;
				team.updateOne({_id:ObjectId(req.body._id_team)}, {$push:{
					member: post_user
				}}, function(err, result){
					response.success = true;
					response.message = "Anda berhasil mendaftar menjadi member team, silahkan tunggu konfirmasi Admin Team";
					res.json(response);
				})	
			});
		}else{
			response.success = false;
			response.message = "Mohon maaf Anda telah mendaftar menjadi member team ini";
			res.json(response);
		}
	});
});

api_user.get('/list_my_idea', function(req, res){
	var competition = db.collection('competitions');
	var data_ide = new Array();
	var i,j, k=0;
	competition.find({ideas:{$elemMatch:{x_api_key:req.headers.x_api_key}}}, {'ideas.$':1, judul:1}).toArray(function(err, idea){
		for(i=0;i<idea.length;i++){
			for(j=0;j<idea[i].ideas.length;j++){
				var content_ide = {}
				content_ide.name = idea[i].ideas[j].name;
				content_ide.x_api_key = idea[i].ideas[j].x_api_key;
				content_ide.body = idea[i].ideas[j].body;
				content_ide.id_comp = idea[i]._id;
				content_ide.judul = idea[i].judul;
				data_ide.push(content_ide);
			}
		}
		res.json(data_ide);
	});
});

api_user.post('/accept_member', upload.array(), function(req, res){
	var team = db.collection('teams');
	var response = {};
	team.findOne({_id:ObjectId(req.body._id_team), member:{$elemMatch:{_id_user:req.headers.x_api_key, role:0}}}, function(err, check){
		if(check!=null){
			team.findOne(ObjectId(req.body._id_team), function(err, result){
				var check_member = new Array();
				var i, member_legal=0;
				check_member = result.member;
				for(i=0;i<check_member.length;i++){
					if(check_member[i].status == 1){
						member_legal+=1;
					}
				}
				if(member_legal<result.max_member){
					team.updateOne({_id:ObjectId(req.body._id_team), member:{$elemMatch:{_id_user:req.body._id_user}}}, {$set:{'member.$.status':1}}, {upsert:false}, function(err, hasil){
						response.success = true;
						response.message = "Selamat anggata team Anda bertambah";	
						res.json(response);		
					});
				}else{
					response.success = false;
					response.message = "Mohon maaf, team Anda sudah mencapai maksimal anggota";
					res.json(response);
				}
			});
		}else{
			response.success = false;
			response.message = "Mohon maaf, anda tidak mempunyai hak";
			res.json(response);
		}
	});
});

api_user.post('/post_idea', upload.array(), function(req, res){
	var competition = db.collection('competitions');
	var user = db.collection('users');
	var idea = {};

	user.findOne({x_api_key:req.headers.x_api_key}, function(err, user){
		idea.name = user.firstname+" "+user.lastname;
		idea.x_api_key = user.x_api_key;
		idea.body = req.body.idea;
		competition.updateOne({_id:ObjectId(req.body._id_competition)},{$push:{
			ideas:idea
		}}, function(err, comp){
			res.json(idea);
		});
	});
});

api_user.post('/invite_user', upload.array(), function(req, res){
	res.json(req.body);
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
		}else{
			res.json({status:'Unauthorized'});
		}
	});
});

api_admin.get('/list_user', function(req, res){
	var collection = db.collection('users');
	collection.find().toArray(function(err, result){
		res.json(result);
	});
});

api_admin.post('/upload_competition', upload.array('foto', 12), function(req,res,next){
	var data_competition = {};
	var collection = db.collection('competitions');
	data_competition = req.body;
	if(data_competition.is_team == "true"){
		data_competition.is_team = true;
	}else{
		data_competition.is_team = false;
		data_competition.max_team = "0";
		data_competition.min_team = "0";
	}
	data_competition.foto = req.files[0].filename;
	collection.insertOne(data_competition, function(err, result){
		res.json(data_competition);
	})
});

api_admin.get('/list_competition', function(req, res){
	var collection = db.collection('competitions');
	var i;
	collection.find({}).toArray(function(err, result){
		for(i=0;i<result.length;i++){
			if(result[i].comments != undefined)
				result[i].comments = result[i].comments.length;
			else{
				result[i].comments = 0;
			}

			if(result[i].ideas != undefined)
				result[i].ideas = result[i].ideas.length;
			else{
				result[i].ideas = 0;
			}			
			if(result[i].joined_team != undefined)
				result[i].joined_team = result[i].joined_team.length;
			else{
				result[i].joined_team = 0;
			}
		}
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
	var response = {};
	collection.removeOne({_id:ObjectId(req.query._id)}, function(err, result){
		response.success=true;
		response.message="Event berhasil di hapus";
		res.json(response);
	})
})

//MENDEFINISIKAN ROUTING PREFIX pada alamat / address http untuk /api_user
app.use('/api_admin', api_admin);
app.use(express.static('uploads'));

server.listen(port);
console.log('port connect in '+port);
