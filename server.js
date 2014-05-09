var net = require('net');
var chunk = require('./chunk.js');
var sys = require('sys');
var colors = require( "colors");
var config = require( "./config.js");

var _stubs = {};
var _clients = {};

function count_dict(dict){
	return Object.keys(dict).length;
}

function random(dict){
	var tmp = Object.keys(dict);
	var max = tmp.length;
	if(max == 0){
		return null;
	}
	var key = tmp[Math.floor(Math.random() * max)];
	return dict[key];
}

function __delete_client(id){
	delete _clients[id];
	sys.log(("client delete [" + id + "],count:" + count_dict(_clients)).red);
};


/** downer **/
var agent = function(sock){
	this.id = sock.remoteAddress;
	this.sock = sock;
	this.echo_timestamp = new Date().getTime();
	var self = this;

	this.start = function(){
		sys.log(("client connected [" + this.id + "]").green);
		_clients[this.id] = self;
		this.decoder = new chunk.Decoder(function(chunkid,type,data){
									if(type == 3){
										//echo package
										self.echo_timestamp = new Date().getTime();
									}else{
										if(_stubs[chunkid] != undefined){
											if(type == 0){
												_stubs[chunkid].write(data);
											}else{
												_stubs[chunkid].end(data);
											}
										}
									}
								},false);

		self.sock.on('data',function(data){
			var tmp = new Buffer(data);
			self.decoder.decode(tmp);
		});

		self.sock.on('error',function(e){
			sys.log(("client" + e).red);
			self.destroy();
		});

		self.sock.on('close',function(){
			self.destroy();
		});

		self.timer = setInterval(function(){
			var now = new Date().getTime();
			if(now - self.echo_timestamp > config['alive_time_out']){
				sys.log(("client [" + self.id + "] timeout").yellow);
				self.destroy();
			}else{
				var alive = new chunk.Encoder().pack(config['alive_chunkid'], 3, new Buffer("alive"));
				self.sock.write(alive);
			}
		},config['alive_pack_intv']);
	};

	this.write = function(data){
		return this.sock.write(data);
	};

	this.destroy = function(){
		sys.log("client sock closed".red);
		if(self.timer != undefined){
			clearInterval(self.timer);
		};
		__delete_client(this.id);
	}
};

/** upper **/
var stuber = function(id,sock,write_func){
	var self = this;
	this.id = id;
	this.sock = sock;
	this.write_func = write_func;
	_stubs[this.id] = self;
	this.sock.on('data',function(buff){
						if(self.write_func != undefined){
							self.write_func(buff);
						}
					});

	this.sock.on('close',function(buff){
		self.__destroy();
	});

	this.sock.on('error',function(e){
		sys.log(("up stream:" + e).red);
		self.__destroy();
	});

	this.write = function(buff){
		if(self.sock != undefined){
			if(self.sock != undefined && 
						self.sock.writable){
				self.sock.write(buff);
			}
		};
	};

	this.end = function(buff){
		if(buff != undefined){
			self.sock.end(buff);
		}else{
			self.sock.end();
		}
		delete _stubs[this.id];
	};

	this.__destroy = function(){
		self.sock.destroy();
		delete _stubs[this.id];
		sys.log(("stub [" + self.id + "] __destroy, count:" +  count_dict(_stubs)).green);
	}
}



///// run
var up = net.createServer(function(sock){
							  var chunkid = sock.remotePort;
							  //sock.setNoDelay(true);
							  var stub = new stuber(chunkid,sock,function(data){
							  		var cli = random(_clients);
							  		if(cli == null){
							  			stub.end();
							  		}else{
								  		var packs = new chunk.Encoder().encode(chunkid, 0, new Buffer(data));
								  		for(var i=0;i<packs.length;i++){
								  			cli.write(packs[i]);
								  		}
							  		}
							  });
							  sys.log(("new stub:" + chunkid + ",count:" + count_dict(_stubs)).green);
						 });

up.listen(config['proxy_port'],config['proxy_addr']);
up.on('listening',function(){  
	sys.log(("http proxy listening on: " + config['proxy_addr'] + ":" + config['proxy_port']).green); 
});


var down = net.createServer(function(sock){
								new agent(sock).start();
							});
down.listen(config['tr_port'],config['proxy_addr']);
down.on('listening',function(){ 
	 sys.log(("tranport stream listening on: " + config['proxy_addr'] + ":" + config['tr_port']).green);
});