let App = require('express')();
let Http = require('http').Server(App);
let Io = require('socket.io')(Http);
let Request = require('request');
let ParseString = require('xml2js').parseString;
let Jimp = require("jimp");
let Ytdl = require('ytdl-core');
let Escape = require('escape-html');
let COLORS = ["#FFF", "#F44336", "#EF5350", "#F44336", "#E53935", "#D32F2F", "#C62828", "#B71C1C", "#FF5252", "#FF1744", "#E91E63", "#EC407A", "#E91E63", "#D81B60", "#C2185B", "#AD1457", "#880E4F", "#FF4081", "#F50057", "#C51162", "#9C27B0", "#BA68C8", "#AB47BC", "#9C27B0", "#8E24AA", "#7B1FA2", "#6A1B9A", "#4A148C", "#E040FB", "#D500F9", "#AA00FF", "#673AB7", "#9575CD", "#7E57C2", "#673AB7", "#5E35B1", "#512DA8", "#4527A0", "#311B92", "#7C4DFF", "#651FFF", "#6200EA", "#3F51B5", "#7986CB", "#5C6BC0", "#3F51B5", "#3949AB", "#303F9F", "#283593", "#1A237E", "#536DFE", "#3D5AFE", "#304FFE", "#1E88E5", "#1976D2", "#1565C0", "#0D47A1", "#448AFF", "#2979FF", "#2962FF", "#0288D1", "#0277BD", "#01579B", "#0091EA", "#0097A7", "#00838F", "#006064", "#009688", "#009688", "#00897B", "#00796B", "#00695C", "#004D40", "#43A047", "#388E3C", "#2E7D32", "#1B5E20", "#558B2F", "#33691E", "#827717", "#E65100", "#F4511E", "#E64A19", "#D84315", "#BF360C", "#FF3D00", "#DD2C00", "#795548", "#A1887F", "#8D6E63", "#795548", "#6D4C41", "#5D4037", "#4E342E", "#3E2723", "#757575", "#616161", "#424242", "#212121", "#607D8B"];
let users = [];
let typers = [];
let access = require('fs').createWriteStream(__dirname + '/node.access.log', {flags: 'a'});
let draw_history = [];
let ClearVotes = [];
let IMAGE_SCALE = 0.2;//
let SERVER_IP = '35.204.63.61';
let SERVER_PORT = 3000;
let currentYoutubeSource = '';

App.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

App.get('/stream', (req, res) => {
    if (currentYoutubeSource.length > 5) {
        try {
            Ytdl(currentYoutubeSource)
                .pipe(res);
        } catch (err) {
            res.sendStatus(503);
        }
    } else {
        res.sendStatus(503);
    }
});

App.use(require('express').static(__dirname + '/public'));

Io.on('connection', (socket) => {
    access.write((new Date()) + '  connected  ' + socket.handshake.address + '\n');

    //auth
    socket.on('auth', (name) => {
        socket.color = COLORS[[Math.floor(Math.random() * COLORS.length)]];
        socket.lineWidth = 2;
        socket.user = Escape(name);
        users.push({
            id: socket.id,
            user: socket.user,
            color: socket.color,
            lineWidth: socket.lineWidth
        });

        //log user
        access.write((new Date()) + ' ' + socket.handshake.address + ' |name|  ' + socket.user+ '\n');

        Io.emit('update-online-users', users);
        updatePencil(Io, socket);
        Io.to(socket.id).emit('draw-history', draw_history);
        systemMsg(socket.id, 'Commands you should try <br>' +
            '<span style="color: #43A047;">!clear</span><br> ' +
            '<span style="color: #43A047;">!size</span> <span style="color: #9575CD;">1-16</span><br> ' +
            '<span style="color: #43A047;">!image</span> <span style="color: #9575CD;">imageUrl</span><br> ' +
            '<span style="color: #43A047;">!todo</span><br>' +
            '<span style="color: #43A047;">!play</span> <span style="color: #9575CD;">youtubeUrl</span><br> ' +
            '<span style="color: #43A047;">!stop</span><br>' +
            '<span style="color: #43A047;">!wolfram</span> ' +
            '<span style="color: #9575CD;">solve x^2 - 16 = 0</span>');
        systemMsg(null, 'welcome to ' + name);
    });

    //chat handler
    socket.on('chat', (msg) => {
        msg = Escape(msg);
        //log to file
        access.write((new Date()) + ' ' + socket.handshake.address + '  |msg|  ' + msg + '\n');

        //unauthorized
        if (typeof socket.user === 'undefined') {
            return;
        }

        //command
        if (cmdHandler(socket, msg)) {
            return;
        }

        //
        Io.emit('chat', {
            user: socket.user,
            color: socket.color,
            data: msg
        });
    });

    //color handler
    socket.on('change-color', (color) => {
        socket.color = Escape(color);
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

//commands
function cmdHandler(socket, msg) {
    let cmd = /^!([a-z]*).?(.*)$/g.exec(msg);
    if (cmd === null) {
        return false;
    }
    switch (cmd[1]) {
        case 'clear':
            if (ClearVotes.filter((item) => {
                    return item === socket.id
                }).length === 0) {
                ClearVotes.push(socket.id);
            }
            if (ClearVotes.length > users.length * 0.6) {
                try {
                    ClearVotes = [];
                    Io.emit('clear-history', true);
                    draw_history = [];
                    Io.emit('chat', {
                        user: 'Board',
                        color: '#A1887F',
                        data: 'Field Cleared'
                    });
                } catch (err) {
                    console.log(err);
                }

            } else {
                Io.emit('chat', {
                    user: 'Board',
                    color: '#A1887F',
                    data: socket.user + ' voted to clear. ' + (Math.floor(users.length * 0.6) + 1 - ClearVotes.length) + ' votes to go.'
                });
            }
            return true;
        case 'size':
            try {
                let lineWidth = cmd[2];
                if (lineWidth >= 1 && lineWidth <= 16) {
                    socket.lineWidth = lineWidth;
                    updatePencil(Io, socket);
                    systemMsg(socket.id, 'Pencil size changed to ' + lineWidth);
                } else {
                    systemMsg(socket.id, 'Pencil size must be between 1-16');
                }
            } catch (err) {
                console.log(err);
            }
            return true;
        case 'image':
            drawImage(cmd[2]);
            return true;
        case 'wolfram':
            try {
                Io.emit('chat', {
                    user: 'Wolfram',
                    color: '#FF7D00',
                    data: cmd[2]
                });
                Request('http://api.wolframalpha.com/v2/query?appid=UWULYY-9VRJKLKEQU&input=' + decodeURIComponent(cmd[2]), function (error, response, body) {
                    ParseString(body, function (err, result) {
                        try {
                            let plot = result.queryresult.pod[2].subpod[0].img[0].$.src;
                            let ans = result.queryresult.pod[1].subpod[0].plaintext[0];

                            Io.emit('chat', {
                                user: 'Wolfram',
                                color: '#FF7D00',
                                data: 'Result ' + ans
                            });
                            drawImage(plot, false, socket.id, 0.15);
                        } catch (err) {
                            console.log(err)
                        }
                    });
                });
            } catch (err) {
                console.log(err);
            }
            return true;
        case 'todo':
            Request('http://35.204.63.61:3001/api/tasks', function (error, response, body) {
                try {
                    let data = JSON.parse(body);
                    for (let i = 0; i < data.length; i++) {
                        let html = data[i].title + ' ' + ((data[i].status === 2) ? '<span style="color:#4CAF50">✔</span>' : '<span style="color:#F44336">✕</span>');
                        Io.emit('chat', {
                            user: 'Tasuku',
                            color: '#3F51B5',
                            data: html
                        });
                    }

                } catch (err) {
                    console.log(err);
                }
            });
            return true;
        case 'play':
            try {
                let source = cmd[2];
                if (source.length > 1) {
                    currentYoutubeSource = source;
                    Io.emit('sound', {play: true, src: 'http://' + SERVER_IP + ':' + SERVER_PORT + '/stream'});
                    Io.emit('chat', {
                        user: 'Youtube',
                        color: '#FF0000',
                        data: 'Playing  ' + cmd[2]
                    });
                }
            } catch (err) {
                console.log(err);
            }
            return true;
        case 'stop':
            try {
                Io.emit('sound', {play: false, src: 'http://' + SERVER_IP + ':' + SERVER_PORT + '/stream'});
                Io.emit('chat', {
                    user: 'Youtube',
                    color: '#FF0000',
                    data: 'Stopped.'
                });
            } catch (err) {
                console.log(err);
            }
            return true;
        default:
            return false;
    }
}

function drawImage(src, notification = true, id = null, custom_scale = null) {
    let data = {},
        image_scale = (custom_scale === null )? IMAGE_SCALE : custom_scale;
    data.src = src;

    Jimp.read(data.src, function (err, image) {
        if (err === null) {

            //scaling
            let scale = image_scale / image.bitmap.height;
            data.width = image.bitmap.width * scale;
            data.height = image_scale * 1.95;

            //fit to canvas
            data.x = Math.random()*(1-data.width-0.01) + 0.01;
            data.y = Math.random()*(1-data.height-0.01) + 0.01;

            Io.emit('draw-image', data);
            if (notification) {
                Io.emit('chat', {
                    user: 'Board',
                    color: '#A1887F',
                    data: 'Drawing ' + data.src
                });
            }
            draw_history.push(data);
        } else {
            systemMsg(id, 'Image cannot be loaded.');
        }
    });
}

function systemMsg(socket_id, msg) {
    let data = {
        user: 'system',
        color: '#F44336',
        data: msg
    };
    if (socket_id === null) {
        Io.emit('chat', data);
    } else {
        Io.to(socket_id).emit('chat', data);
    }

}

function updatePencil(Io, socket) {
    Io.to(socket.id).emit('update-pencil', {color: socket.color, lineWidth: socket.lineWidth});
}

//clear
function clearHistoryAd(timer) {
    setTimeout(() => {
        Io.emit('chat', {
            user: 'Board',
            color: '#F44336',
            data: 'Type !clear to vote for clear.'
        });
    }, 60000);
}

clearHistoryAd(1);

Http.listen(SERVER_PORT, () => {
    console.log('listening on *:' + SERVER_PORT);
});