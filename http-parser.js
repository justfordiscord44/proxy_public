var Buff = function(maxlen){
    this.maxlen = maxlen;
    this.buffer = new Buffer(this.maxlen);
    this.len = 0;

    this.data = function(){ return this.buffer; };

    this.length = function(){ return this.len; };

    this.reset = function(){ this.len = 0; }

    this.append = function(raw){
        if(this.len + raw.length < this.maxlen){
            raw.copy(this.buffer,this.len,0,raw.length);
            this.len += raw.length;
        }else{
            this.reset();
        }
    }
};


exports.HTTPParser = HTTPParser;
function HTTPParser(type,callback) {
  this["INIT_" + type]();
  this.onHeadersComplete = callback;
}
HTTPParser.REQUEST = "REQUEST";
HTTPParser.RESPONSE = "RESPONSE";
HTTPParser.prototype.reinitialize = HTTPParser;
HTTPParser.prototype.eat = function(buff){
    if(this.buffer == undefined){
        this.buffer = new Buff(1024);
    };
    this.buffer.append(buff);
    //console.log(this.buffer.data().toString('utf-8',0,this.buffer.length()));
    var len = buff.length;
    this.execute(this.buffer.data(),this.buffer.length() - len, len);
};

HTTPParser.prototype.execute = function (chunk, offset, length) {
  /*
  console.log({
    chunk: chunk.toString("utf8", offset, length),
    offset: offset,
    length: length
  });
  */
  this.chunk = chunk;
  this.start = offset;
  this.offset = offset;
  this.end = offset + length;
  while (this.offset < this.end) {
    this[this.state]();
    this.offset++;
  }
};

HTTPParser.prototype.INIT_REQUEST = function () {
  this.state = "REQUEST_LINE";
  this.lineState = "DATA";
  this.info = {
    headers: {}
  };  
};

HTTPParser.prototype.NEXT = function () {
  this.state = "REQUEST_LINE";
  this.lineState = "DATA";
  this.info = {
     headers: {}
  };
  if(this.buffer !== undefined){
        this.buffer.reset();
  }
};


HTTPParser.prototype.consumeLine = function () {
  if (this.captureStart === undefined) {
    this.captureStart = this.offset;
  }
  var byte = this.chunk[this.offset];
  if (byte === 0x0d && this.lineState === "DATA") { // \r
    this.captureEnd = this.offset;
    this.lineState = "ENDING";
    return;
  }
  if (this.lineState === "ENDING") {
    this.lineState = "DATA";
    if (byte !== 0x0a) {
      return;
    }
    var line = this.chunk.toString("ascii", this.captureStart, this.captureEnd);
    this.captureStart = undefined;
    this.captureEnd = undefined;
    return line;
  }
}
var requestExp = /^([A-Z]+) (.*) HTTP\/([0-9]).([0-9])$/;
HTTPParser.prototype.REQUEST_LINE = function () {
  var line = this.consumeLine();
  if (line === undefined) return;
  var match = requestExp.exec(line);
  this.info.method = match[1];
  this.info.url = match[2];
  this.info.versionMajor = match[3];
  this.info.versionMinor = match[4];
  this.state = "HEADER";
};
var headerExp = /^([^:]+): *(.*)$/;
HTTPParser.prototype.HEADER = function () {
  var line = this.consumeLine();
  if (line === undefined) return;
  if (line) {
    var match = headerExp.exec(line);
    this.info.headers[match[1].toLowerCase()] = match[2];
  }
  else {
    if(this.onHeadersComplete !== undefined){
      this.onHeadersComplete(this.info);
    };
    //this.state = "BODY";
    this.NEXT();
  }
};