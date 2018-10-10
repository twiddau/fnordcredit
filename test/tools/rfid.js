winston = require('winston');
server = require('http').createServer();
io = require('socket.io').listen(server);

var sock = {
    emit: function () {}
};

io.sockets.on('connection', function (socket) {
        winston.info("New connection received.");
        sock = socket;
    });

var server = server.listen(23421, function () {
    winston.info('PC/SC RFID server started!');

    setInterval(function() {
        sock.emit('tag', JSON.stringify({'uid': '12345678'}));
        winston.info("Sending test RFID token");
    }, 5 * 1000);

    /*setInterval(function() {
        if (sock.broadcast) {
            getAllUsersAsync(function (err, users) {
                if (err) {
                    return res.send(500, 'Error retrieving users from database');
                }
                sock.broadcast.emit('accounts', JSON.stringify(users));
            });

            sock.broadcast.emit('accounts', JSON.stringify(users));
        }
    }, 600 * 1000);*/

});