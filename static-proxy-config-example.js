// COPY this to static-proxy-config.js
exports.root = "../../"; 

var todos = {
	1:   {id: 1, name: "wake up", complete: true},
	2:   {id: 2, name: "take out trash", complete: false},
	3:   {id: 3, name: "do dishes", complete: false}
},
	setData = function(on, data){
		for(var name in data){
			on[name] = data[name] === "true" ? true : (data[name] === "false" ? false : data[name] )
		}
		return on;
	};

exports.special = {
		"GET \/todos\/(\\d+)": function(data, whole, part ){
			return todos[part]
		},
		"POST \/todos": function(data){
			var max = 0;
			for(var id in todos){
				max = Math.max(+id, max)
			}
			max++;
			data.id = max
			todos[max] = setData({},data);
			return {id: max}
		},
		"DELETE \/todos\/(\\d+)": function(data, whole, part){
			delete todos[part];
		},
		"PUT \/todos\/(\\d+)" : function(data, whole, part){
			var todo = todos[part];
			setData(todo, data);
		},
		"GET \/todos": function(data){
			var todosList = [];
			for(var id in todos){
				todosList.push(todos[id])
			}
			return todosList;
		}
};
exports.proxies = {
		"/remoteService" : "http://server.com:1400/remoteService"
};
exports.port = 8125;