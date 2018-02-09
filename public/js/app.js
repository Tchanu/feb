'use strict';

window.isTyping = false;
window.isTypingTimer = null;

$(function () {
    var socket = io();
    var canvas = document.getElementsByClassName('whiteboard')[0];
    var drawing = false;
    var context = canvas.getContext('2d')
    var current = {
        color: '#222'
    };
    var offset = $('.board').offset();




    //drawing listeners
    canvas.addEventListener('mousedown', onMouseDown, false);
    canvas.addEventListener('mouseup', onMouseUp, false);
    canvas.addEventListener('mouseout', onMouseUp, false);
    canvas.addEventListener('mousemove', throttle(onMouseMove, 10), false);

    //
    socket.on('drawing', onDrawingEvent);

    //screen resize
    window.addEventListener('resize', onResize, false);
    onResize();

    function drawLine(x0, y0, x1, y1, color, emit){
        context.beginPath();
        context.moveTo(x0, y0);
        context.lineTo(x1, y1);
        context.strokeStyle = color;
        context.lineWidth = 2;
        context.stroke();
        context.closePath();

        if (!emit) { return; }
        var w = canvas.width;
        var h = canvas.height;

        socket.emit('drawing', {
            x0: x0 / w,
            y0: y0 / h,
            x1: x1 / w,
            y1: y1 / h,
            color: color
        });
    }

    function onMouseDown(e){
        drawing = true;
        current.x = e.clientX-offset.left;
        current.y = e.clientY-offset.top;
    }

    function onMouseUp(e){
        if (!drawing) { return; }
        drawing = false;
        drawLine(current.x, current.y, e.clientX-offset.left, e.clientY-offset.top, current.color, true);
    }

    function onMouseMove(e){
        if (!drawing) { return; }
        drawLine(current.x, current.y, e.clientX-offset.left, e.clientY-offset.top, current.color, true);
        current.x = e.clientX-offset.left;
        current.y = e.clientY-offset.top;
    }


    // limit the number of events per second
    function throttle(callback, delay) {
        var previousCall = new Date().getTime();
        return function() {
            var time = new Date().getTime();

            if ((time - previousCall) >= delay) {
                previousCall = time;
                callback.apply(null, arguments);
            }
        };
    }

    function onDrawingEvent(data){console.log(data.x0);
        var w = canvas.width;
        var h = canvas.height;
        drawLine(data.x0 * w, data.y0 * h, data.x1 * w, data.y1 * h, data.color);
    }


    function onResize() {
        canvas.width = $('.board').width();
        canvas.height = $('.board').height();
    }

    $('form').submit(function(){
        socket.emit('chat', {for:'everyone', data:$('#m').val()});
        $('#m').val('');
        endTyping();
        return false;
    });
    $('#m').keypress(function (event ) {
        if(!window.isTyping){
            window.isTyping = true;
            socket.emit('typing',true);
        }
        clearTimeout(window.isTypingTimer);
        window.isTypingTimer = setTimeout(endTyping, 2000);
    });

    function endTyping() {
        window.isTyping = false;
        socket.emit('typing',false);
    }

    socket.on('chat', function(msg){
        var html = '<li><span style="color:'+msg.color+';font-size:'+msg.size+'">'+msg.user+'</span>: '+msg.data+'</li>';
        $('#messages').append(html);
        $("html, body").animate({ scrollTop: $(document).height() }, "slow");
        var audio = new Audio('../media/not.mp3');
        audio.play();
    });

    socket.on('typing', function (data) {
        if(data.length > 0){
            $('.is-typing').css('opacity',1);
            $('#typing_user').html(data.toString());
        }else{
            $('.is-typing').css('opacity',0);
        }
    })

    socket.on('update-online-users', function (data) {
        $('#users strong').html(data.length);

        var users = ' ';
        for(var i=0; i < data.length; i++){
            users +='<li><a href="javascript:msg(\''+(data[i].id)+'\');">'+(data[i].user)+'</a></li>';
        }
        $('#online_users').html(users);
    });

    socket.on('update-color', function (color) {console.log(color);
        current.color = color;
    })
});
function msg(id){
    $('#m').val($('#m').val()+'!msg '+id+' ');
    $('#m').focus();
}