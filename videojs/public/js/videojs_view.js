/* Javascript for videojsXBlock. */
var urls = new Array();
var players = new Array();
var player;
var youtubePlayerHandler;
var vimeoPlayerHandler;

function videojsXBlockInitView(runtime, element) {
    /* Weird behaviour :
     * In the LMS, element is the DOM container.
     * In the CMS, element is the jQuery object associated*
     * So here I make sure element is the jQuery object */
    if (element.innerHTML) element = $(element);

    //urls.push(runtime.handlerUrl(element, 'tracking_log'));
    var handlerUrl = runtime.handlerUrl(element, 'tracking_log');

    var previousTime = 0;
    var currentTime = 0;

    var video = element.find('video');
    for (var i = 0; i < video.size(); i++) {
        videojs(video.get(i), {playbackRates: [0.75, 1, 1.25, 1.5, 1.75, 2]}, function () {
            console.log('ID', this, this.id());
            players[this.id()] = handlerUrl;
            console.log('plyers', players);
            this.on('timeupdate', function () {
                previousTime = currentTime;
                currentTime = this.currentTime();
                if (this.seeking()) {//Math.round()
                    var msg = "{'id':'" + get_xblock_id(players[this.id()]) + "','old_time':" + previousTime + ",'new_time':" + currentTime + ",'type':'onSlideSeek','code':'html5'}";
                    send_msg(players[this.id()], msg, 'seek_video');
                }
            });
            this.on('pause', function () {
                var msg = "{'id':'" + get_xblock_id(players[this.id()]) + "','currentTime':" + currentTime + ",'code':'html5'}";
                send_msg(players[this.id()], msg, 'pause_video');
            });
            this.on('play', function () {
                var msg = "{'id':'" + get_xblock_id(players[this.id()]) + "','currentTime':" + currentTime + ",'code':'html5'}";
                send_msg(players[this.id()], msg, 'play_video')
            });
            this.on('ended', function () {
                var msg = "{'id':'" + get_xblock_id(players[this.id()]) + "','currentTime':" + currentTime + ",'code':'html5'}";
                send_msg(players[this.id()], msg, 'stop_video')
            });
            this.on('loadstart', function () {
                var msg = "{'id':'" + get_xblock_id(players[this.id()]) + "','code':'html5'}";
                console.log(msg);
                send_msg(players[this.id()], msg, 'load_video')
            })
        });
    }
}

function get_xblock_id(url) {
    console.log('get_xblock_id_start');
    return url.slice(url.lastIndexOf('@') + 1, url.indexOf('/handler'));
}

function send_msg(url, msg, type) {
    console.log('send_msg_start');
    $.ajax({
        type: "POST",
        url: url,
        data: JSON.stringify({msg: msg, type: type}),
        success: function (result) {
            console.log(result);
            if (result['result'] == 'success') {
                return 1;
            } else {
                return 0;
            }
        }
    });
    console.log('send_msg_end');
}

// YOUTUBE FUNCTIONS

function youtubeInit(runtime, element) {
  console.log('src', element);
  if (element.innerHTML) element = $(element);

  youtubePlayerHandler = runtime.handlerUrl(element, 'tracking_log');

  var tag = document.createElement('script');
  tag.src = "https://www.youtube.com/iframe_api";
  var firstScriptTag = document.getElementsByTagName('script')[0];
  firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
}

function onYouTubeIframeAPIReady() {
  player = new YT.Player('player', {
    height: '390',
    width: '640',

    videoId: 'M7lc1UVf-VE',
    events: {
      'onReady': onPlayerReady,
      'onStateChange': onPlayerStateChange
    }
  });
}

function onPlayerStateChange(event) {
    switch(event.data) {
      case YT.PlayerState.PLAYING:
        var msg = "{'id':'" + get_xblock_id(youtubePlayerHandler) + "','currentTime':" + player.getCurrentTime() + ",'code':'youtube'}";
        send_msg(youtubePlayerHandler, msg, 'play_video')
        break;
      case YT.PlayerState.PAUSED:
        var msg = "{'id':'" + get_xblock_id(youtubePlayerHandler) + "','currentTime':" + player.getCurrentTime() + ",'code':'youtube'}";
        send_msg(youtubePlayerHandler, msg, 'pause_video');
        break;
      case YT.PlayerState.ENDED:
        var msg = "{'id':'" + get_xblock_id(youtubePlayerHandler) + "','currentTime':" + player.getCurrentTime() + ",'code':'youtube'}";
        send_msg(youtubePlayerHandler, msg, 'stop_video');
        break;
      default:
        return;
    }
}

function onPlayerReady(event) {
  event.target.setVolume(100);
  event.target.playVideo();
}

// VIMEO FUNCTIONS

function vimeoInit(runtime, element) {
    $(function() {
        var player = $('#player_1');
        var playerOrigin = '*';
        vimeoPlayerHandler = runtime.handlerUrl(element, 'tracking_log');

        // Listen for messages from the player
        if (window.addEventListener) {
            window.addEventListener('message', onMessageReceived, false);
        }
        else {
            window.attachEvent('onmessage', onMessageReceived, false);
        }

        // Handle messages received from the player
        function onMessageReceived(event) {
            // Handle messages from the vimeo player only
            if (!(/^https?:\/\/player.vimeo.com/).test(event.origin)) {
                return false;
            }

            if (playerOrigin === '*') {
                playerOrigin = event.origin;
            }

            var data = JSON.parse(event.data);

            switch (data.event) {
                case 'ready':
                    onReady();
                    break;

                case 'play':
                    onPlay(data.data);
                    break;

                case 'playProgress':
                    onPlayProgress(data.data);
                    break;

                case 'pause':
                    onPause(data.data);
                    break;

                case 'seeked':
                    onSeek(data.data);
                    break;

                case 'finish':
                    onFinish(data.data);
                    break;
            }
        }

        function onReady() {
        }
        function onPlay(data) {
            console.log('DATA', data);
            var msg = "{'id':'" + get_xblock_id(vimeoPlayerHandler) + "','currentTime':" + data.seconds + ",'code':'vimeo'}";
            send_msg(vimeoPlayerHandler, msg, 'play_video')
        }

        function onPause(data) {
            console.log('pause DATA', data);
            var msg = "{'id':'" + get_xblock_id(vimeoPlayerHandler) + "','currentTime':" + data.seconds + ",'code':'vimeo'}";
            send_msg(vimeoPlayerHandler, msg, 'pause_video')
        }

        function onSeek(data) {
            console.log('seek DATA', data);
            var msg = "{'id':'" + get_xblock_id(vimeoPlayerHandler) + "','old_time':0,'new_time':" + data.seconds + ",'type':'onSlideSeek','code':'vimeo'}";
            send_msg(vimeoPlayerHandler, msg, 'pause_video')
        }

        function onFinish(data) {
            console.log('finish  DATA', data);
            var msg = "{'id':'" + get_xblock_id(vimeoPlayerHandler) + "','currentTime':" + data.seconds + ",'code':'vimeo'}";
            send_msg(vimeoPlayerHandler, msg, 'finish_video')
        }

        function onPlayProgress(data) {
            var quartile;
            if (data.percent % 25 === 0) {
                quartile = data.percent / 25;
                analytics.track('Video Progress', {
                    quartile: quartile
                })
            }
        }
    });
}
