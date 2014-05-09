var proxy = require('./http-proxy.js');
var net = require('net');

var StandProxy = function(){
	this.sockn = 0;
	this.start = function(){
		var self = this;
		this.listener = net.createServer(function(sock){
												var client = new proxy.HTTPProxy(0,function(id,data,end){
																			    	if(end === true){
																			    		if(data !== null){
																			    			sock.end(data);
																			    		}else{
																			    			sock.end();
																			    		}
																			    	}else{
																			    		if(sock != undefined &&
																			    				 sock != null && 
																			    				 	 sock.writable && 
																			    				 	 	  data !== null){
																			    			sock.write(data);
																			    		}
																			    	}
																				});
												sock.on('data',function(buff){
													client.write(buff);
												});

												sock.on('close',function(){
													console.log("socket closed");
												});

												sock.on('error',function(err){
													console.log('sock err:' + err);
												});
											});
		this.listener.on('listening',function(){ console.log("stand proxy listening on port:" + self.listener.address().port);});
		this.listener.listen(8080,"127.0.0.1");
	};

	this.stop = function(){
		if(this.listener !== undefined){
			this.listener.close();
			this.listener = undefined;
		}
	}
};


new StandProxy().start();