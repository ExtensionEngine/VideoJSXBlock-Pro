/* Javascript for videojsXBlock. */
var urls = [];
var players = [];
var player;
var youtubePlayerHandler;
var vimeoPlayerHandler;
var iframeMessaging = {
    inactivityTimer: undefined,
    isPausedOrFinished: false,
    isBlocked: false,
    activeWhileBlocked: false
};

function hideToolbars() {
    parent.postMessage(JSON.stringify({action: 'hideToolbars'}), '*');
}

function showToolbars() {
    // don't send too many messages
    if (!iframeMessaging.isBlocked) {
        parent.postMessage(JSON.stringify({
            action: 'showToolbars',
            setTimer: !iframeMessaging.isPausedOrFinished
        }), '*');

        iframeMessaging.isBlocked = true;

        setTimeout(function () {
            iframeMessaging.isBlocked = false;
            if (iframeMessaging.activeWhileBlocked) {
                iframeMessaging.activeWhileBlocked = false;
                showToolbars();
            }
        }, 500);
    } else {
        iframeMessaging.activeWhileBlocked = true;
    }
}

function videojsXBlockInitView(runtime, element) {

    /* Weird behaviour :
     * In the LMS, element is the DOM container.
     * In the CMS, element is the jQuery object associated*
     * So here I make sure element is the jQuery object */
    if (element.innerHTML) element = $(element);

    // send signal to show toolbars
    element.on('mousemove', showToolbars);
    element.on('scroll', showToolbars);
    element.on('keypress', showToolbars);

    //urls.push(runtime.handlerUrl(element, 'tracking_log'));
    var handlerUrl = runtime.handlerUrl(element, 'tracking_log');

    var previousTime = 0;
    var currentTime = 0;

    var video = element.find('video');

    var options = {
        "controlBar": {
            "muteToggle": false,
            "playToggle": false,
            "volumeControl": false,
            "fullscreenToggle": false,
            "currentTimeDisplay": false,
            "timeDivider": false,
            "durationDisplay": false,
            "remainingTimeDisplay": false,
            "playbackRateMenuButton": false
        }
    };

    videojs(video[0], options, function () {
        players[this.id()] = handlerUrl;
        this.on('timeupdate', function () {
            previousTime = currentTime;
            currentTime = this.currentTime();
            if (this.seeking()) {
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
            send_msg(players[this.id()], msg, 'load_video')
        });

        this.play();
    });
}

function get_xblock_id(url) {
    return url.slice(url.lastIndexOf('@') + 1, url.indexOf('/handler'));
}

function send_msg(url, msg, type) {
    // notify parent that the video has started
    switch (type) {
        case 'play_video':
            iframeMessaging.isPausedOrFinished = false;
            hideToolbars();
            break;
        case 'pause_video':
            iframeMessaging.isPausedOrFinished = true;
            showToolbars();
            break;
        case 'ended':
            iframeMessaging.isPausedOrFinished = true;
            showToolbars();
            break;
    }

    $.ajax({
        type: "POST",
        url: url,
        data: JSON.stringify({msg: msg, type: type}),
        success: function (result) {
            if (result['result'] == 'success') {
                return 1;
            } else {
                return 0;
            }
        }
    });
}

// YOUTUBE FUNCTIONS

function youtubeInit(runtime, element) {
    if (element.innerHTML) element = $(element);

    youtubePlayerHandler = runtime.handlerUrl(element, 'tracking_log');

    var tag = document.createElement('script');
    tag.src = "https://www.youtube.com/iframe_api";
    var firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
}

function onYouTubeIframeAPIReady() {
    var videoId = $('#player').attr('data-video');

    player = new YT.Player('player', {
        height: window.innerHeight * 0.8,
        width: window.innerWidth * 0.8,

        videoId: videoId,
        events: {
            'onReady': onPlayerReady,
            'onStateChange': onPlayerStateChange
        }
    });
}

function onPlayerStateChange(event) {
    switch (event.data) {
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
    $(function () {
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
            var msg = "{'id':'" + get_xblock_id(vimeoPlayerHandler) + "','currentTime':" + data.seconds + ",'code':'vimeo'}";
            send_msg(vimeoPlayerHandler, msg, 'play_video')
        }

        function onPause(data) {
            var msg = "{'id':'" + get_xblock_id(vimeoPlayerHandler) + "','currentTime':" + data.seconds + ",'code':'vimeo'}";
            send_msg(vimeoPlayerHandler, msg, 'pause_video')
        }

        function onSeek(data) {
            var msg = "{'id':'" + get_xblock_id(vimeoPlayerHandler) + "','old_time':0,'new_time':" + data.seconds + ",'type':'onSlideSeek','code':'vimeo'}";
            send_msg(vimeoPlayerHandler, msg, 'pause_video')
        }

        function onFinish(data) {
            var msg = "{'id':'" + get_xblock_id(vimeoPlayerHandler) + "','currentTime':" + data.seconds + ",'code':'vimeo'}";
            send_msg(vimeoPlayerHandler, msg, 'finish_video')
        }
    });
}
