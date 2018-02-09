var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
let COLORS = ['red','#5C6BC0','green'];
let users_num = 0;
let users = [];
let typers = [];

app.get('/', function(req, res){
    res.sendFile(__dirname + '/index.html');
});

app.get('/not.mp3', function(req, res){
    res.sendFile(__dirname + '/not.mp3');
});

io.on('connection', function(socket){
    users_num++;

    //assing color
    if(typeof socket.color === 'undefined' ){
        socket.color = COLORS[[Math.floor(Math.random()*COLORS.length)]];
    }

    //Send msg
    socket.on('chat message', function(msg){

        if(typeof socket.user === 'undefined' ){
            if(msg.data.split('!name').length > 1){
                socket.user = msg.data.split('!name')[1];
                users.push({
                    id: socket.id,
                    user: msg.data.split('!name')[1]
                });
                io.emit('update-online-users', users);
            }else{
                io.to(socket.id).emit('chat message', {
                    user: 'system',
                    color: 'red',
                    size: '1em',
                    data: 'Specify name first. Type !name yourName'
                });
                return;
            }
            io.to(socket.id).emit('chat message', {
                user: 'system',
                color: 'red',
                size: '1em',
                data: 'welcome to'+socket.user
            });
            return;
        }
        if(msg.data.split('!msg').length > 1){
            var private_user_id = msg.data.split('!msg')[1].split(' ')[1];
            io.to(private_user_id).emit('chat message', {
                user: socket.user,
                color: socket.color,
                size: socket.size,
                data: msg.data
            });
            io.to(socket.id).emit('chat message', {
                user: socket.user,
                color: socket.color,
                size: socket.size,
                data: msg.data
            });
            return;
        }

        if(msg.data.split('!color').length > 1){
            socket.color = msg.data.split('!color')[1];
        }
        if(msg.data.split('!size').length > 1){
            socket.size = msg.data.split('!size')[1];
        }

        if(msg.for === 'everyone'){
            io.emit('chat message', {
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

            io.emit('chat message', {user:'',data: left_user+' left the conversation.'});
        }catch(err){
            io.emit('chat message', {user:'',data: 'Guest left the conversation.'});
        }

        users = users.filter(function(item) {
            return item.id !== socket.id
        });
        io.emit('update-online-users', users);
    });
});


http.listen(3000, function(){
    console.log('listening on *:3000');
});