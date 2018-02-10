let App = require('express')();
let Http = require('http').Server(App);
let Io = require('socket.io')(Http);
let COLORS = ["#F44336", "#EF5350", "#F44336", "#E53935", "#D32F2F", "#C62828", "#B71C1C", "#FF5252", "#FF1744", "#D50000", "#E91E63", "#EC407A", "#E91E63", "#D81B60", "#C2185B", "#AD1457", "#880E4F", "#FF4081", "#F50057", "#C51162", "#9C27B0", "#BA68C8", "#AB47BC", "#9C27B0", "#8E24AA", "#7B1FA2", "#6A1B9A", "#4A148C", "#E040FB", "#D500F9", "#AA00FF", "#673AB7", "#9575CD", "#7E57C2", "#673AB7", "#5E35B1", "#512DA8", "#4527A0", "#311B92", "#7C4DFF", "#651FFF", "#6200EA", "#3F51B5", "#7986CB", "#5C6BC0", "#3F51B5", "#3949AB", "#303F9F", "#283593", "#1A237E", "#536DFE", "#3D5AFE", "#304FFE", "#1E88E5", "#1976D2", "#1565C0", "#0D47A1", "#448AFF", "#2979FF", "#2962FF", "#0288D1", "#0277BD", "#01579B", "#0091EA", "#0097A7", "#00838F", "#006064", "#009688", "#009688", "#00897B", "#00796B", "#00695C", "#004D40", "#43A047", "#388E3C", "#2E7D32", "#1B5E20", "#558B2F", "#33691E", "#827717", "#E65100", "#F4511E", "#E64A19", "#D84315", "#BF360C", "#FF3D00", "#DD2C00", "#795548", "#A1887F", "#8D6E63", "#795548", "#6D4C41", "#5D4037", "#4E342E", "#3E2723", "#757575", "#616161", "#424242", "#212121", "#607D8B"];
let users = [];
let typers = [];
let access = require('fs').createWriteStream(__dirname + '/node.access.log', {flags: 'a'});
let draw_history = [];
let ClearHistoryEvery = 2;//Clear history every x min
let clearingHistoryIn = 0;//time left

App.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

App.use(require('express').static(__dirname + '/public'));

Io.on('connection', (socket) => {
    access.write((new Date()) + '  connected  ' + socket.handshake.address + '\n');

    //auth
    socket.on('auth', (name) => {
        socket.color = COLORS[[Math.floor(Math.random() * COLORS.length)]];
        socket.lineWidth = 2;
        socket.user = name;
        users.push({
            id: socket.id,
            user: socket.user,
            color: socket.color,
            lineWidth: socket.lineWidth
        });
        access.write((new Date()) + ' ' + socket.handshake.address + ' |name|  ' + name + '\n');

        Io.emit('update-online-users', users);
        Io.to(socket.id).emit('update-pencil', {color: socket.color, lineWidth: socket.lineWidth});
        Io.to(socket.id).emit('draw-history', draw_history);
        Io.emit('chat', {
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

        Io.emit('chat', {
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
        Io.emit('update-online-users', users);
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

        Io.emit('typing', typers);

    });

    //drawing handler
    socket.on('drawing', (data) => {
        socket.broadcast.emit('drawing', data);
        draw_history.push(data);
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
        Io.emit('chat', {user: '', data: left_user + ' left the conversation.'});

        users = users.filter((item) => {
            return item.id !== socket.id
        });
        Io.emit('update-online-users', users);
    });
});

//clear
function clearHistory(timer) {
    setTimeout(() => {
        if(timer === ClearHistoryEvery){//min
            try{
                Io.emit('clear-history',true);
                draw_history = [];
                Io.emit('chat',{
                    user: 'Board',
                    color: 'red',
                    data: 'Field Cleared'
                });
            }catch (err){

            }
            timer = 0;
            clearingHistoryIn = timer
        }else{
            Io.emit('chat',{
                user: 'Board',
                color: 'red',
                data: 'Clearing field in '+(ClearHistoryEvery-timer)+' min.'
            });
            clearingHistoryIn = ++timer;
        }
        clearHistory(clearingHistoryIn);
    }, 60000);
}
clearHistory(1);

Http.listen(3000, () => {
    console.log('listening on *:3000');
});