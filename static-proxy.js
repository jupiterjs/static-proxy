var http = require('http'),
	fs = require('fs'),
	path = require('path'),
	url = require('url'),
	qs = require('querystring'),
	extend = function(d, s){
		for(var prop in s){
			d[prop] = s[prop]
		}
		return d;
	};


var checkAndDo = function(value, obj, doThis, request, response){
 		 for(var regStr in obj){
    		var reg = new RegExp(regStr);
	    	if(reg.test(value)){
	    		return doThis(regStr, obj[regStr], request, response);
	    	}
	    }
 	},
 	fakeReload = function(filename, cb){
		fs.readFile( path.join( __dirname, filename ), function(error, content) {
			//console.log("(function(exports){  "+content+"; return exports })({})")
			cb( eval("(function(exports){  "+content+"; return exports })({})") );
		});
 	},
 	sendToProxy = function(requestUrl, redirectTo, request, response){
 		var proxyurl = request.url.replace(requestUrl, redirectTo),
 			parsed = url.parse(proxyurl, true);
 			
 		
 		// make a request
 		var proxy_request = http.request({
 			hostname: parsed.hostname,
 			port: parsed.port || 80,
 			path: parsed.path,
 			method: request.method || "GET",
 			headers: request.headers
 		});
 		
 		console.log("  ",request.method, request.url, "->",proxyurl)
 		
 		// REQUEST -> PROXY
 		request.on('data', function(chunk) {
		    proxy_request.write(chunk, 'binary');
		});
 		request.on('end', function() {
		    proxy_request.end();
		});
 		
 		// PROXY -> RESPONSE
 		proxy_request.on('response', function (proxy_response) {
		    proxy_response.on('data', function(chunk) {
		      response.write(chunk, 'binary');
		    });
		    proxy_response.on('end', function() {
		      response.end();
		    });
		    response.writeHead(proxy_response.statusCode, proxy_response.headers);
		}); 
		proxy_request.on("error", function(e){
			
    		response.writeHead(500, { 'Content-Type': "text/html" });
        	response.end("<html><body>"+e+"</body></html>", 'utf-8');
            	
		})
		return true;	
 	},
 	handleSpecial = function(requestUrl, specialFunction, request, response){
 		var matching = request.method.toUpperCase() + " "+ request.url;
 		var body = '',
 			reg = new RegExp(requestUrl);
 			
 		// get all data from server
		request.on('data', function (chunk) {
			body+= chunk;
		});
		request.on('end', function(){
			// after we have all data
			var parts = matching.match(reg);
	    	
	    	// break up the form params into an object
	    	parts.unshift(qs.parse(body));
	    	
	    	var data = specialFunction.apply(url.parse(request.url, true), parts);
	    	
	    	response.writeHead(200, { 'Content-Type': "application/json" });
	        response.end( JSON.stringify(data), 'utf-8');
		})
 		
 		return true;
 	},
 	serverCode = function (request, response) {
 
	   
	    var parsedUrl = url.parse(request.url, true);
	    
	    // PROXY CHECK
	    if( checkAndDo(request.url, config.proxies || {}, sendToProxy, request, response) ) {
	    	return;
	    }
	    if(checkAndDo(request.method.toUpperCase() + " "+ request.url, config.special || {}, handleSpecial, request, response)){
	    	return;
	    }
	    
	    
	    console.log('->', request.method, request.url);
	    var basePath = path.dirname( path.join( __dirname, current ) );
	    var filePath = path.join( basePath, config.root, parsedUrl.pathname );
	    
	    
	    if (filePath == './') {
	    	filePath = './index.htm';
	    }
	        
	         
	
	    var extname = path.extname(filePath);
	    var contentType = 'text/html';
	    switch (extname) {
	        case '.js':
	            contentType = 'text/javascript';
	            break;
	        case '.css':
	            contentType = 'text/css';
	            break;
	        case '.webm':
	        	contentType = 'video/webm';
	        	break;
	        case '.ogg':
	        	contentType = 'audio/ogg'
	        	break;
	    }
	     
	    fs.exists(filePath, function(exists) {
	     
	        if (exists) {
	            fs.readFile(filePath, function(error, content) {
	                if (error) {
	                    response.writeHead(500);
	                    response.end();
	                }
	                else {
	                	//setTimeout(function(){
	                		response.writeHead(200, { 'Content-Type': contentType });
	                    	response.end(content, 'utf-8');
	                	//},parseInt(Math.random()*1000))
	                    
	                }
	            });
	        }
	        else {
	            response.writeHead(404);
	            response.end();
	        }
	    });
	     
	},
	config,
	server,
 	setConfig = function(){
 		// save config settings
 		var old = extend({}, config||{});
 		
 		fakeReload(current, function(c){
 			config = c;
	 		console.log("Reading "+current)
	 		//for(var prop in config){
	 		//	console.log("       "+prop)
	 		//}
	 		if(!server){
	 			server = http.createServer(serverCode).listen(config.port);
	 			console.log('Server running at http://127.0.0.1:'+config.port+'/');
	 		} else if(config.port != old.port){
	 			console.log("Restarting Server")
	 			server.close(function(){
	 				server.listen(config.port);
	 				console.log('Server running at http://127.0.0.1:'+config.port+'/');
	 			})
	 		}
 		});
 		
 		
 		
 	};

// FIND static-proxy-config.js
// check within current folder, then check parent, then check 

var current = "static-proxy-config.js";
for(var i =0; i < 4; i++){
	if( fs.existsSync( path.join(__dirname, current) ) ){
		fs.watch(path.join(__dirname, current),{persistent: false}, setConfig);
		setConfig();
		break;
	} else {
		current = "../"+current;
	}
}

 