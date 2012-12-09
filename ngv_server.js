/** CONFIG **/
var debug = true;
var log_level = 1; // 1: No, 3: verbose
var encoding = 'utf-8';
var public_html_path = 'public_html';
var http_port = 8000;
var host_ip = '127.0.0.1';

if (process.argv.length > 2) {
    host_ip = process.argv[2];
}
if (process.argv.length > 3) {
    http_port = process.argv[3];
}

/** IMPORT MODULES **/
var http = require('http');
var io = require('socket.io');
var fs = require('fs');
var static = require('node-static');

/** DATA **/
var clients = {};
var current_policy_number = 0;
var result = {
    count : 0,
    poll : [0, 0, 0, 0, 0],
};
var blank = {
    count : 0,
    poll : [0, 0, 0, 0, 0],
};
var vote_result = {
    1 : blank,
    2 : blank,
    3 : blank,
    4 : blank,
    5 : blank,
    6 : blank,
    7 : blank,
};
fs.readFile('vote_result.txt', function (err, data) {
    if (err) throw err;
    vote_result = JSON.parse(data);
});

/** INIT SERVICES **/
var file = new(static.Server)(public_html_path);
var http_server = http.createServer(function(req, res) {
    req.addListener('end', function() {
        file.serve(req, res);
    });
});

/** LOGGERS & ETC **/
var do_nothing = function() {};

var ngv_error_logger = function() {
    console.log(Array.prototype.join.call(arguments, ", "));
};

var ngv_disconn_logger = function(con) {
    if (debug) {
        console.log('[Message]: '+con.id+' disconnected');
    }
};

var ngv_client_logger = function(con, data) {
    if (debug) {
        console.log("[Client:"+con.id+"]");
        console.log(data);
    }
};

/** MAIN **/
ngv_voting = function(con) {
    con.on('close', do_nothing);
    con.on('vote', function(vote) {
        ngv_client_logger(con, vote);
        clients[con.id] = vote;
    });

    con.on('update', function() {
        var conn_clients = io.sockets.clients();
        result.count = conn_clients.length - 1;
        result.poll = [0, 0, 0, 0, 0];
        for (var i=0; i<conn_clients.length; i++) {
            var id = conn_clients[i].id;
            if (clients[id]) {
                result.poll[clients[id].radio-1] += 1;
            }
        }
        con.emit('show_result', result);
    });

    con.on('request_vote_result', function() {
        con.emit('vote_result', vote_result);
    });

    con.on('save_vote_result', function(save_data) {
        vote_result[save_data.num] = save_data.data;
        fs.writeFile('vote_result.txt', JSON.stringify(vote_result), function (err) {
            if (err) throw err;
            console.log('[Message]: vote_result.txt saved');
        });
    });
};

/** START SERVER **/
io = io.listen(http_server);
io.set('log level', log_level);
http_server.listen(http_port, host_ip);
console.log('[Message]: HTTP file server is running at http://'+host_ip+':'+http_port);

io.sockets.on('connection', ngv_voting);
io.sockets.on('error', ngv_error_logger);
io.sockets.on('disconnected', ngv_disconn_logger);

