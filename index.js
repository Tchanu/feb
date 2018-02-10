let app = require('express')();
let http = require('http').Server(app);
let io = require('socket.io')(http);
let COLORS = ["#F44336", "#EF5350", "#F44336", "#E53935", "#D32F2F", "#C62828", "#B71C1C", "#FF5252", "#FF1744", "#D50000", "#E91E63", "#EC407A", "#E91E63", "#D81B60", "#C2185B", "#AD1457", "#880E4F", "#FF4081", "#F50057", "#C51162", "#9C27B0", "#BA68C8", "#AB47BC", "#9C27B0", "#8E24AA", "#7B1FA2", "#6A1B9A", "#4A148C", "#E040FB", "#D500F9", "#AA00FF", "#673AB7", "#9575CD", "#7E57C2", "#673AB7", "#5E35B1", "#512DA8", "#4527A0", "#311B92", "#7C4DFF", "#651FFF", "#6200EA", "#3F51B5", "#7986CB", "#5C6BC0", "#3F51B5", "#3949AB", "#303F9F", "#283593", "#1A237E", "#536DFE", "#3D5AFE", "#304FFE", "#1E88E5", "#1976D2", "#1565C0", "#0D47A1", "#448AFF", "#2979FF", "#2962FF", "#0288D1", "#0277BD", "#01579B", "#0091EA", "#0097A7", "#00838F", "#006064", "#009688", "#009688", "#00897B", "#00796B", "#00695C", "#004D40", "#43A047", "#388E3C", "#2E7D32", "#1B5E20", "#558B2F", "#33691E", "#827717", "#E65100", "#F4511E", "#E64A19", "#D84315", "#BF360C", "#FF3D00", "#DD2C00", "#795548", "#A1887F", "#8D6E63", "#795548", "#6D4C41", "#5D4037", "#4E342E", "#3E2723", "#757575", "#616161", "#424242", "#212121", "#607D8B"];
let users = [];
let typers = [];
let access = require('fs').createWriteStream(__dirname + '/node.access.log', {flags: 'a'});

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

app.use(require('express').static(__dirname + '/public'));

io.on('connection', (socket) => {
    access.write((new Date()) + '  connected  ' + socket.handshake.address + '\n');

    //auth
    socket.on('auth', (name) => {
        socket.color = COLORS[[Math.floor(Math.random() * COLORS.length)]];
        socket.user = name;
        users.push({
            id: socket.id,
            user: socket.user,
            color: socket.color
        });
        access.write((new Date()) + ' ' + socket.handshake.address + ' |name|  ' + name + '\n');

        io.emit('update-online-users', users);
        io.to(socket.id).emit('update-color', socket.color);
        io.emit('chat', {
            user: 'system',
            color: 'red',
            data: 'welcome to ' + name
        });
    });

    //chat handler
    socket.on('chat', (msg) => {
        access.write((new Date()) + ' ' + socket.handshake.address + '  |msg|  ' + msg + '\n');
        if (typeof socket.user === 'undefined') {
            return;
        }

        io.emit('chat', {
            user: socket.user,
            color: socket.color,
            data: msg
        });
    });

    //color handler
    socket.on('change-color', (color) => {
        socket.color = color;
        users = users.filter((item) => {
            if (item.id === socket.id) {
                item.color = socket.color;
            }
            return item.id
        });
        io.emit('update-online-users', users);
    });

    //typing handler
    socket.on('typing', (msg) => {
        if (msg) {
            if (typeof socket.user !== 'undefined') {
                typers.push(socket.user);
            }
        } else {
            typers = typers.filter((item) => {
                return item !== socket.user
            });
        }

        io.emit('typing', typers);

    });

    //drawing handler
    socket.on('drawing', (data) => {
        socket.broadcast.emit('drawing', data);
    });

    socket.on('disconnect', (e) => {
        access.write((new Date()) + '  disconnect  ' + socket.handshake.address + '\n');
        let left_user = 'Guest';
        try {
            left_user = users.filter((item) => {
                return item.id === socket.id
            })[0].user;
        } catch (err) {

        }
        io.emit('chat', {user: '', data: left_user + ' left the conversation.'});

        users = users.filter((item) => {
            return item.id !== socket.id
        });
        io.emit('update-online-users', users);
    });
});


http.listen(3000, () => {
    console.log('listening on *:3000');
});