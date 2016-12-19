/* Javascript for videojsXBlock. */
function videojsXBlockInitStudio(runtime, element) {

    $(element).find('.action-cancel').bind('click', function () {
        runtime.notify('cancel', {});
    });

    var handlerUrl = runtime.handlerUrl(element, 'save_videojs');
    var uploadUrl = runtime.handlerUrl(element, 'upload_video');

    $(element).find('.action-save').bind('click', function () {
        var data = new FormData();
        data.append('usage_id', $(element).data('usage-id'));
        data.append('display_name', $(element).find('#videojs_edit_display_name').val());
        data.append('display_description', $(element).find('#videojs_edit_display_description').val());
        data.append('url', $(element).find('#videojs_edit_url').val());
        data.append('allow_download', $(element).find('#videojs_edit_allow_download').val());
        data.append('source_text', $(element).find('#videojs_edit_source_text').val());
        data.append('source_url', $(element).find('#videojs_edit_source_url').val());
        data.append('start_time', $(element).find('#videojs_edit_start_time').val());
        data.append('end_time', $(element).find('#videojs_edit_end_time').val());
        data.append('sub_title', $(element).find('#videojs_sub_title').val());
        data.append('thumbnail', $(element).find('input[name=thumbnail]')[0].files[0]);

        runtime.notify('save', {state: 'start'});

        $.ajax({
            url: handlerUrl,
            type: 'POST',
            data: data,
            cache: false,
            dataType: 'json',
            processData: false,
            contentType: false
        }).done(function(response) {
            runtime.notify('save', {state: 'end'});
            window.location.reload(false);
        });
    });

    $(element).find("#captionFile").bind('change', function () {
        var file = this.files[0];
        name = file.name;
        uploadCaption(handlerUrl);
    });

    // video file upload
    $(element).find('#fileupload').bind('change', function () {
        var data = new FormData();
        data.append('usage_id', $(element).data('usage-id'));

        var file = $(element).find('input[name=fileupload]')[0].files[0];
        if (file) {
            if (file.size > 4000000000) {
                alert("File is too big.");
                return;
            }

            if (file.type !== 'video/mp4' && file.type !== 'video/ogg') {
                alert("Format is not good.");
                return;
            }
        }
        data.append('fileupload', file);

        $.ajax({
            xhr: function() {
                var xhr = new window.XMLHttpRequest();
                xhr.upload.addEventListener("progress", function(evt) {
                    if (evt.lengthComputable) {
                        var percentComplete = (evt.loaded / evt.total)*100;
                        $(element).find('#fileuploadProgress').attr('value', percentComplete);
                        $(element).find('#fileuploadStatus').html('Uploading file...').css('color', '#555');
                    }
               }, false);

               return xhr;
            },
            type: 'POST',
            url: uploadUrl,
            data: data,
            cache: false,
            dataType: 'json',
            processData: false,
            contentType: false,
            success: function(data){
                $(element).find('#videojs_edit_url').val(data.url);
                $(element).find('#fileuploadStatus').html('File upload success!').css('color', 'green');
            },
            error: function() {
                alert('File upload failed!');
                $(element).find('#fileuploadStatus').html('File upload failed!').css('color', 'red');
            }
        });

        $(element).find('#fileuploadProgress').show();
        $(element).find('#fileuploadStatus').html('File upload started.').css('color', '#555');
    });
}

function uploadCaption(url) {
    $(element).find('#loading-upload').show();
    var action = getFileUploadUrl(url);
    var formData = new FormData($('#file-chooser')[0]);
    $.ajax({
        url: action,  //server script to process data
        type: 'POST',
        xhr: function () {  // custom xhr
            myXhr = $.ajaxSettings.xhr();
            return myXhr;
        },
        success: function (msg) {
            $(element).find('#loading-upload').hide();
            if (msg['asset']['url']) {
                $(element).find('#videojs_sub_title').val(msg['asset']['url']);
                $(element).find('#upload-success').show();
            } else {
                $(element).find('#upload-fail').show();
            }
        },
        data: formData,
        cache: false,
        contentType: false,
        processData: false
    });
}

function getFileUploadUrl(str) {
    return '/assets/course' + str.slice(str.indexOf('block-') + 5, str.indexOf('+type')) + '/';
}
