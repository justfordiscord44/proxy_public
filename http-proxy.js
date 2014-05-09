var httpparser = require('./http-parser.js');
var net = require('net');
var http = require('http'),url = require('url');
var constants = require('constants');
var sys = require('sys');
var colors = require( "colors");


var HTTPProxy = exports.HTTPProxy = function(id,write_func){
	this.id = id;
	this.write_func = write_func;
	var self = this;
	this.tx = 0;
	this.pl = 0;

	this.parser = new httpparser.HTTPParser(httpparser.HTTPParser.REQUEST,function(req){
		self._sendrq(req);
	});

	this.write = function(data){
		try{
			self.parser.eat(data);
		}catch(e){

		}
		
	};

	this._sendrq = function(req){
		var self = this;
		var _url=url.parse(req.url);
     	var _host=req.headers.host.split(":");

     	sys.log((self.id + ":" + req.method + " " + req.url).green);
     	var option={	
     				'host':_host[0],
     				'secureOptions': constants.SSL_OP_NO_TLSv1_2,
                  	'port':Number(_host[1]||'80'),
                  	'path':_url['pathname']+(_url['search']||""),
                  	'method':req.method,
                  	'headers':req.headers,
                  	'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
                  };
        option.agent = false;
	    http.request(option,function(res){
	    	// write response
	    	sys.log((self.id + ":" + res.statusCode + " " + req.url).green);
	    	headers = _flush_header(res.statusCode, res.headers);
	    	res.on('data',function(chunk){
    			if(_header_val(headers,'transfer-encoding') == 'chunked'){
	    			_flush_data(chunk.length.toString(16) + "\r\n",false);
	    			_flush_data(chunk,false);
	    			_flush_data("\r\n",false);
	    		}else{
	    			_flush_data(chunk,false);
	    		}
	    	});

	    	res.on('error',function(e){
	    		sys.log(("http Response: " + req.url + " " + e).yellow);
	    	});

	    	res.on('close',function(e){
	    		_flush_data("\n",true);
	    	});

	    	res.on('end',function(){
	    		_flush_data("0\r\n\r\n",true);
	    	});

	    	res.socket.on('error',function(e){
	    		sys.log(("http Socket:" + e).yellow);
	    	});
	    }).on('error',function(e){
	    	sys.log(("http proxy:" + e).red);
	    	_end_with_err(505,e.toString());
	    }).end();

	    var _end_with_err = function(errno,message){
	    	_flush_header(errno,{});
	    	_flush_data(message);
	    	_flush_data("\n",true);
	    };

	    var _header_val = function(header,name){
			for(key in headers){
				if(key.toLowerCase() == name.toLowerCase()){
					return headers[key].toLowerCase();
				}
			}
			return "";
		};

	    //////////////////////////////////////////////////////////////
	    var _flush_data = function(data,end){
	    	if(self.write_func != undefined){
	    		self.write_func(self.id,data,end);
	    	}
		};

		var _flush_header = function(status,headers){
			_flush_data("HTTP/1.1 "+ status+ " OK\r\n",false);
			var filters = {	 }
			for(key in headers){
				if(filters[key.toLowerCase()] != undefined){
					continue;
				}
				if(key.toLowerCase() == 'set-cookie'){
					//TODO
				}else{
					_flush_data(key + ': ' + headers[key] + "\r\n",false);
				}
			}
		    _flush_data("\r\n",false);
		    return headers;
		};
	}
};