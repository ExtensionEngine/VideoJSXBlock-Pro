/* Javascript for videojsXBlock. */
function videojsXBlockInitStudio(runtime, element) {

    $(element).find('.action-cancel').bind('click', function () {
        runtime.notify('cancel', {});
    });

    var handlerUrl = runtime.handlerUrl(element, 'save_videojs');

    $(element).find('.action-save').bind('click', function () {
        var data = {
            'display_name': $('#videojs_edit_display_name').val(),
            'display_description': $('#videojs_edit_display_description').val(),
            'thumbnail_url': $('#videojs_edit_thumbnail_url').val(),
            'url': $('#videojs_edit_url').val(),
            'allow_download': $('#videojs_edit_allow_download').val(),
            'source_text': $('#videojs_edit_source_text').val(),
            'source_url': $('#videojs_edit_source_url').val(),
            'start_time': $('#videojs_edit_start_time').val(),
            'end_time': $('#videojs_edit_end_time').val(),
            'sub_title': $('#videojs_sub_title').val()
        };

        runtime.notify('save', {state: 'start'});

        $.post(handlerUrl, JSON.stringify(data)).done(function (response) {
            if (response.result === 'success') {
                runtime.notify('save', {state: 'end'});
                // Reload the whole page :
                window.location.reload(false);
            } else {
                runtime.notify('error', {msg: response.message})
            }
        });
    });

    $(element).find("input[name=file]").bind('change', function () {
        var file = this.files[0];
        name = file.name;
        //if (name.slice(name.lastIndexOf('.')) != 'vtt') {
        //    $('#error-file').show();
        //} else {
            uploadCaption(handlerUrl);
        //}
    });
}

function uploadCaption(url) {
    $('#loading-upload').show();
    var action = getFileUploadUrl(url);
    var formData = new FormData($('#file-chooser')[0]);
    $.ajax({
        url: action,  //server script to process data
        type: 'POST',
        xhr: function () {  // custom xhr
            myXhr = $.ajaxSettings.xhr();
            //if (myXhr.upload) { // check if upload property exists
            //    myXhr.upload.addEventListener('progress', progressHandlingFunction, false); // for handling the progress of the upload
            //}
            return myXhr;
        },
        //beforeSend: beforeSendHandler,
        success: function (msg) {
            $('#loading-upload').hide();
            if (msg['asset']['url']) {
                $('#videojs_sub_title').val(msg['asset']['url']);
                $('#upload-success').show();
            } else {
                $('#upload-fail').show();
            }
        },
        // Form数据
        data: formData,
        //Options to tell JQuery not to process data or worry about content-type
        cache: false,
        contentType: false,
        processData: false
    });
}

function getFileUploadUrl(str) {
    return '/assets/course' + str.slice(str.indexOf('block-') + 5, str.indexOf('+type')) + '/';
}
