var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
let COLORS = ['#F44336','#5C6BC0','#9C27B0','#673AB7','#3F51B5','#009688','#4CAF50','#8BC34A','#E91E63'];
let users = [];
let typers = [];

app.get('/', function(req, res){
    res.sendFile(__dirname + '/public/index.html');
});

app.get('/css/style.css', function(req, res){
    res.sendFile(__dirname + '/public/css/style.css');
});

app.get('/js/app.js', function(req, res){
    res.sendFile(__dirname + '/public/js/app.js');
});

app.get('/media/not.mp3', function(req, res){
    res.sendFile(__dirname + '/public/media/not.mp3');
});

io.on('connection', function(socket){
    //assing color
    if(typeof socket.color === 'undefined' ){
        socket.color = COLORS[[Math.floor(Math.random()*COLORS.length)]];
        io.to(socket.id).emit('update-color',socket.color);
    }
    io.to(socket.id).emit('chat', {
        user: 'system',
        color: 'red',
        size: '1em',
        data: 'Hello. type !name yourName. Available commands: !color, !size, !msg:'
    });

    //Send msg
    socket.on('chat', function(msg){

        if(typeof socket.user === 'undefined' ){
            if(msg.data.split('!name').length > 1){
                socket.user = msg.data.split('!name')[1];
                users.push({
                    id: socket.id,
                    user: msg.data.split('!name')[1]
                });
                io.emit('update-online-users', users);
            }else{
                io.to(socket.id).emit('chat', {
                    user: 'system',
                    color: 'red',
                    size: '1em',
                    data: 'Specify name first. Type !name yourName'
                });
                return;
            }
            io.to(socket.id).emit('chat', {
                user: 'system',
                color: 'red',
                size: '1em',
                data: 'welcome to'+socket.user
            });
            return;
        }
        if(msg.data.split('!msg').length > 1){
            var private_user_id = msg.data.split('!msg')[1].split(' ')[1];
            io.to(private_user_id).emit('chat', {
                user: socket.user,
                color: socket.color,
                size: socket.size,
                data: msg.data
            });
            io.to(socket.id).emit('chat', {
                user: socket.user,
                color: socket.color,
                size: socket.size,
                data: msg.data
            });
            return;
        }

        if(msg.data.split('!color').length > 1){
            socket.color = msg.data.split('!color')[1];
            io.to(socket.id).emit('update-color',socket.color);
        }
        if(msg.data.split('!size').length > 1){
            socket.size = msg.data.split('!size')[1];
        }

        if(msg.for === 'everyone'){
            io.emit('chat', {
                user: socket.user,
                color: socket.color,
                size: socket.size,
                data: msg.data
            });
        }else{

        }

    });
    socket.on('typing', function(msg){
        if(msg){
            if(typeof socket.user !== 'undefined'){
                typers.push( socket.user);
            }
        }else{
            typers = typers.filter(function(item) {
                return item !== socket.user
            });
        }

        io.emit('typing', typers);

    });
    socket.on('disconnect', function(e){
        try{
            var left_user = users.filter(function(item) {
                return item.id === socket.id
            })[0].user;

            io.emit('chat', {user:'',data: left_user+' left the conversation.'});
        }catch(err){
            io.emit('chat', {user:'',data: 'Guest left the conversation.'});
        }

        users = users.filter(function(item) {
            return item.id !== socket.id
        });
        io.emit('update-online-users', users);
    });

    socket.on('drawing', (data) => socket.broadcast.emit('drawing', data));
});


http.listen(3000, function(){
    console.log('listening on *:3000');
});