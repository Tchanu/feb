'use strict';

window.isTyping = false;
window.isTypingTimer = null;

$(function () {
    let socket = io();
    let canvas = document.getElementsByClassName('whiteboard')[0];
    let drawing = false;
    let context = canvas.getContext('2d');
    let current = {
        color: '#222'
    };

    onResize();

    function drawLine(x0, y0, x1, y1, color, emit) {
        context.beginPath();
        context.moveTo(x0, y0);
        context.lineTo(x1, y1);
        context.strokeStyle = color;
        context.lineWidth = 2;
        context.stroke();
        context.closePath();

        if (!emit) {
            return;
        }
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

    function onMouseDown(e) {
        drawing = true;
        current.x = e.clientX;
        current.y = e.clientY;
    }

    function onMouseUp(e) {
        if (!drawing) {
            return;
        }
        drawing = false;
        drawLine(current.x, current.y, e.clientX, e.clientY, current.color, true);
    }

    function onMouseMove(e) {
        if (!drawing) {
            return;
        }
        drawLine(current.x, current.y, e.clientX, e.clientY, current.color, true);
        current.x = e.clientX;
        current.y = e.clientY;
    }


    // limit the number of events per second
    function throttle(callback, delay) {
        var previousCall = new Date().getTime();
        return function () {
            var time = new Date().getTime();

            if ((time - previousCall) >= delay) {
                previousCall = time;
                callback.apply(null, arguments);
            }
        };
    }

    function onDrawingEvent(data) {
        var w = canvas.width;
        var h = canvas.height;
        drawLine(data.x0 * w, data.y0 * h, data.x1 * w, data.y1 * h, data.color);
    }


    function onResize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }

    function endTyping() {
        window.isTyping = false;
        socket.emit('typing', false);
    }

    function call(id) {
        //todo call
    }


    //--------------------------------key events
    $('form').submit(function () {
        socket.emit('chat', $('#m').val());
        $('#m').val('');
        endTyping();
        return false;
    });

    $('#m').keypress(function (event) {
        if (!window.isTyping) {
            window.isTyping = true;
            socket.emit('typing', true);
        }
        clearTimeout(window.isTypingTimer);
        window.isTypingTimer = setTimeout(endTyping, 2000);
    });

    $('#nameInput').keyup(function (event) {
        if (event.keyCode === 13) {
            $('#welcome .btn').click();
        }
        if ($(this).val().length > 2) {
            $('#welcome .btn').show();
        } else {
            $('#welcome .btn').hide();
        }
    });

    $('#welcome .btn').click(function () {
        socket.emit('auth', $('#nameInput').val());
        $('#welcome').hide();
    })

    //--------------------------------socket events
    socket.on('chat', function (msg) {
        var html = '<li><span style="color:' + msg.color + ';">' + msg.user + '</span>: ' + msg.data + '</li>';
        $('#messages').append(html);
        $("#messages").animate({scrollTop: $(document).height()}, "slow");
        var audio = new Audio('../media/not.mp3');
        //audio.play();
    });

    socket.on('typing', function (data) {
        if (data.length > 0) {
            $('.is-typing').css('opacity', 1);
            $('#typing_user').html(data.toString());
        } else {
            $('.is-typing').css('opacity', 0);
        }
    })

    socket.on('update-online-users', function (data) {
        $('#users-panel strong').html(data.length);

        var users = ' ';
        for (var i = 0; i < data.length; i++) {
            users += '<li id="' + data[i].id + '" style="color: ' + data[i].color + '"><a href="javascript:call(\'' + (data[i].id) + '\');">' + (data[i].user) + '</a></li>';
        }
        $('#online_users').html(users);
    });

    socket.on('update-color', function (color) {
        current.color = color;
        $('#color').val(color);
        $('#color').data('paletteColorPickerPlugin').reload();
    });

    //socket drawing handler
    socket.on('drawing', onDrawingEvent);

    //draw from history
    socket.on('draw-history', function (data) {console.log(data);
        let i = 0;
        function go() {
            if (++i < data.length) {
                onDrawingEvent(data[i]);
                setTimeout(go, 10);
            }
        }
        go();
    });

    socket.on('clear-history',function(e){
        console.log('clear');
        onResize();
    });


    //drawing listeners
    canvas.addEventListener('mousedown', onMouseDown, false);
    canvas.addEventListener('mouseup', onMouseUp, false);
    canvas.addEventListener('mouseout', onMouseUp, false);
    canvas.addEventListener('mousemove', throttle(onMouseMove, 10), false);

    //todo touch support


    //screen resize
    window.addEventListener('resize', onResize, false);


    $('[name="color-picker"]').paletteColorPicker({
        clear_btn: null,
        colors: ["#F44336", "#EF5350", "#F44336", "#E53935", "#D32F2F", "#C62828", "#B71C1C", "#FF5252", "#FF1744", "#D50000", "#E91E63", "#EC407A", "#E91E63", "#D81B60", "#C2185B", "#AD1457", "#880E4F", "#FF4081", "#F50057", "#C51162", "#9C27B0", "#BA68C8", "#AB47BC", "#9C27B0", "#8E24AA", "#7B1FA2", "#6A1B9A", "#4A148C", "#E040FB", "#D500F9", "#AA00FF", "#673AB7", "#9575CD", "#7E57C2", "#673AB7", "#5E35B1", "#512DA8", "#4527A0", "#311B92", "#7C4DFF", "#651FFF", "#6200EA", "#3F51B5", "#7986CB", "#5C6BC0", "#3F51B5", "#3949AB", "#303F9F", "#283593", "#1A237E", "#536DFE", "#3D5AFE", "#304FFE", "#1E88E5", "#1976D2", "#1565C0", "#0D47A1", "#448AFF", "#2979FF", "#2962FF", "#0288D1", "#0277BD", "#01579B", "#0091EA", "#0097A7", "#00838F", "#006064", "#009688", "#009688", "#00897B", "#00796B", "#00695C", "#004D40", "#43A047", "#388E3C", "#2E7D32", "#1B5E20", "#558B2F", "#33691E", "#827717", "#E65100", "#F4511E", "#E64A19", "#D84315", "#BF360C", "#FF3D00", "#DD2C00", "#795548", "#A1887F", "#8D6E63", "#795548", "#6D4C41", "#5D4037", "#4E342E", "#3E2723", "#757575", "#616161", "#424242", "#212121", "#607D8B"],
        position: 'upside',
        onchange_callback: function (color) {
            current.color = color;
            socket.emit('change-color', color);
            console.log();
        }
    });
});


/*!
 * JQuery Palette Color Picker v1.13 by Carlos Cabo ( @putuko )
 * https://github.com/carloscabo/jquery-palette-color-picker
 */
(function (t) {
    "use strict";
    t.paletteColorPicker = function (e, a) {
        var s = "palette-color-picker", i = t(e), n = this, o = null, l = i.val(), r = i.attr("name"),
            c = t("<div>").addClass(s + "-button").attr("data-target", r), u = t("<div>").addClass(s + "-bubble"),
            f = {}, d = {
                custom_class: null,
                colors: null,
                position: "upside",
                insert: "before",
                clear_btn: "first",
                timeout: 2e3,
                set_background: false,
                close_all_but_this: false
            }, g = "ontouchstart" in document.documentElement ? "touchstart click" : "click";
        n.init = function () {
            n.settings = t.extend({}, d, a);
            var e = i.attr("value");
            if (typeof e === typeof undefined || e === false) {
                e = "";
                i.attr("value", e)
            }
            i.attr("data-initialvalue", i.attr("value"));
            if (n.settings.colors === null) {
                n.settings.colors = i.data("palette")
            }
            if (typeof n.settings.colors[0] === "string") {
                n.settings.colors = t.map(n.settings.colors, function (t, e) {
                    var a = {};
                    a[t] = t;
                    return a
                })
            }
            n.settings.insert = n.settings.insert.charAt(0).toUpperCase() + n.settings.insert.slice(1);
            if (n.settings.custom_class) {
                u.addClass(n.settings.custom_class)
            }
            t.each(n.settings.colors, function (e, a) {
                var s = Object.keys(a)[0], i = a[s], n = t("<span>").addClass("swatch").attr({
                    title: s,
                    "data-color": i,
                    "data-name": s
                }).css("background-color", i);
                if (s === l) {
                    n.addClass("active");
                    c.css("background", i)
                }
                n.appendTo(u)
            });
            if (n.settings.clear_btn !== null) {
                var o = t("<span>").addClass("swatch clear").attr("title", "Clear selection");
                if (n.settings.clear_btn === "last") {
                    o.addClass("last").appendTo(u)
                } else {
                    o.prependTo(u)
                }
            }
            n.destroy = function () {
                c.remove();
                t.removeData(i[0])
            };
            n.clear = function () {
                u.find(".active").removeClass("active");
                c.removeAttr("style");
                i.val("")
            };
            n.reset = function () {
                if (i.attr("data-initialvalue") === "") {
                    n.clear()
                } else {
                    var t = i.attr("data-initialvalue");
                    u.find('[data-name="' + t + '"]').trigger("click")
                }
            };
            n.reload = function () {
                var t = i.val();
                if (t === "" || typeof t === typeof undefined || t === false) {
                    n.reset()
                } else {
                    if (u.find('[data-name="' + t + '"]').length) {
                        u.find('[data-name="' + t + '"]').trigger("click")
                    } else {
                        n.reset()
                    }
                }
            };
            c.append(u).on(g, function (e) {
                e.preventDefault();
                e.stopPropagation();
                var a = t(this);
                if (!t(e.target).hasClass(s + "-bubble")) {
                    if (typeof n.settings.onbeforeshow_callback === "function") {
                        n.settings.onbeforeshow_callback(this)
                    }
                    a.toggleClass("active");
                    var i = a.find("." + s + "-bubble");
                    if (n.settings.close_all_but_this) {
                        t("." + s + "-bubble").not(i).fadeOut()
                    }
                    i.fadeToggle();
                    if (a.hasClass("active")) {
                        clearTimeout(n.timer);
                        n.timer = setTimeout(function () {
                            a.trigger("pcp.fadeout")
                        }, n.settings.timeout)
                    }
                }
            }).on("pcp.fadeout", function () {
                t(this).removeClass("active").find("." + s + "-bubble").fadeOut()
            }).on("mouseenter", "." + s + "-bubble", function () {
                clearTimeout(n.timer)
            }).on("mouseleave", "." + s + "-bubble", function () {
                n.timer = setTimeout(function () {
                    c.trigger("pcp.fadeout")
                }, n.settings.timeout)
            }).on(g, "." + s + "-bubble span.swatch", function (e) {
                e.preventDefault();
                e.stopPropagation();
                var a = t(this).attr("data-color"), i = t(this).attr("data-name"),
                    o = t("." + s + '-button[data-target="' + t(this).closest("." + s + "-button").attr("data-target") + '"]'),
                    l = t(this).closest("." + s + "-bubble");
                l.find(".active").removeClass("active");
                if (t(e.target).is(".clear")) {
                    o.removeAttr("style");
                    a = ""
                } else {
                    t(this).addClass("active");
                    o.css("background", a)
                }
                if (typeof n.settings.onchange_callback === "function") {
                    n.settings.onchange_callback(a)
                }
                if (n.settings.set_background === false) {
                    t('[name="' + o.attr("data-target") + '"]').val(i)
                } else {
                    t('[name="' + o.attr("data-target") + '"]').css({"background-color": a})
                }
            })["insert" + n.settings.insert](i);
            if (n.settings.position === "downside" || i.offset().top + 20 < u.outerHeight()) {
                u.addClass("downside")
            }
        };
        t("body").on(g, function (e) {
            if (!t(e.target).hasClass(s + "-button")) {
                t(c).removeClass("active").find("." + s + "-bubble").fadeOut()
            }
        });
        n.init()
    };
    t.fn.paletteColorPicker = function (e) {
        return this.each(function () {
            if (typeof t(this).data("paletteColorPickerPlugin") === "undefined") {
                t(this).data("paletteColorPickerPlugin", new t.paletteColorPicker(this, e))
            }
        })
    }
})(jQuery);