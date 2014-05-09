/** 编码 **/
var MAX_BUFF_SIZE = 1024;

var Encoder = exports.Encoder = function(){
	this.encode = function(id, type, data){
		var result = [];
		if(data.length < MAX_BUFF_SIZE){
			result.push(this.pack(id,type,data));
		}else{
			for(var i = 0; i < data.length; i+= MAX_BUFF_SIZE){
				result.push(this.pack(id,type,data.slice(i,i+MAX_BUFF_SIZE)));
			}
		}
		return result;
	},

	this.pack = function(id, type, data){
		var buff = new Buffer(data.length + 10);
		buff.writeUInt8(0x03,0);
		buff.writeUInt8(type,1);
		buff.writeUInt32LE(id,2);
		buff.writeUInt32LE(data.length,6);
		data.copy(buff,10);	
		return buff;
	}
};

/** 解码 */
var Decoder =  exports.Decoder = function(callback,debug){
	var self = this;
	this._state = '_init';
	this._id = 0xffffff;
	this._type = 0;
	this._maxbuffer = MAX_BUFF_SIZE;
	this._header_buff = new Buffer(9);
	this._header_offset = 0;
	this._buff = new Buffer(this._maxbuffer);
	this._buff_len = 0;
	this._total = 0;
	this._callback = callback;
	this._debug = debug;

	this.decode = function(data){
		/*
		console.log("======" + this._state);
		for(var i=0;i<data.length;i++){
			console.log(data[i].toString(16));
		}
		*/
		if(self._debug){
			console.log(this._state +": data=" + data.length);
		}
		next = this[this._state](data);
		if(next !== null){
			this._state = next['state'];
			var tmp = next['data'];
			if(tmp.length == 0){
				return true;
			}else{
				return this.decode(tmp);
			}
		}else{
			return true;
		}
	};

	this._init = function(data){
		for(var i =0; i<data.length; i++){
			if(data[i] == 0x03){
				return {
							"state":"_header",
							"data":data.slice(i+1,data.length)
					    }
			}
		}
		return null;
	};

	this._header = function(data){
		for(var i =0; i<data.length; i++){
			this._header_buff[this._header_offset++] = data[i];
			if(this._header_offset == 1){
				this._type = this._header_buff.readUInt8(0);
			}else if(this._header_offset == 5){
				this._id = this._header_buff.readUInt32LE(1);
				if(self._debug){
					console.log("id:" + this._id);
				}
			}else if(this._header_offset == 9){
				this._total = this._header_buff.readUInt32LE(5);
				if(self._debug){
					console.log("total:" + this._total);
				}
				return {
							"state":"_data",
							"data":data.slice(i+1,data.length)
					    }
			}
		}
		return null;
	};

	this._data = function(data){
		var len = data.length;
		if( this._buff_len+len <= this._total){
			data.copy(this._buff,this._buff_len);
			this._buff_len += len;
			if(this._buff_len == this._total){
				return this._reset([]);
			}
		}else{
			var middle = this._total-this._buff_len;
			data.copy(this._buff,this._buff_len,0,middle);
			this._buff_len = this._total;
			return this._reset(data.slice(middle,data.length));
		}
		return null;
	};

	this._reset = function(data){
		if(this._callback != undefined){
			if(self._debug){
				console.log("======= id:" + this._id + ",type:" + this._type + ",data:" + this._buff.length +  " =========");
			}
			this._callback(this._id, this._type, this._buff.slice(0,this._total));
		}
		this._state = '_init';
		this._header_buff.fill(0);
		this._header_offset = 0;
		this._buff_len = 0;
		this._total = 0;
		return {
					"state":"_init",
					"data":data
			    }
	};
} 


function test_chunk(){
	var decoder = new Decoder(function(id,type,data){
		console.log("id:" + id + ",type:" + type +  ",chunk:" + data.length);
	});
	var tmp = new Buffer(11514);
	for(var i=0;i<11514;i++){
		tmp[i] = 47;
	}
	var data = new Encoder().encode(63085, 1, tmp);
	var split = 5;
	decoder.decode(data.slice(0,split));
	decoder.decode(data.slice(split,data.length));
	decoder.decode(data);
}
