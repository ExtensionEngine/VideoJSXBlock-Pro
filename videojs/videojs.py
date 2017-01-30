""" videojsXBlock main Python class"""

import pkg_resources
import time
import re

from django.template import Context, Template

from xblock.core import XBlock
from xblock.fields import Scope, Integer, String, Boolean
from xblock.fragment import Fragment


from webob.response import Response
from xblock_django.mixins import FileUploadMixin


class videojsXBlock(XBlock, FileUploadMixin):
    '''
    Icon of the XBlock. Values : [other (default), video, problem]
    '''
    icon_class = "video"

    '''
    Fields
    '''
    display_name = String(display_name="Display Name",
                          default="VIDEO",
                          scope=Scope.settings,
                          help="This name appears in the horizontal navigation at the top of the page.")

    url = String(display_name="Video URL",
                 default="http://vjs.zencdn.net/v/oceans.mp4",
                 scope=Scope.content,
                 help="The URL for your video.")

    allow_download = Boolean(display_name="Video Download Allowed",
                             default=False,
                             scope=Scope.content,
                             help="Allow students to download this video.")

    source_text = String(display_name="Source document button text",
                         default="",
                         scope=Scope.content,
                         help="Add a download link for the source file of your video. Use it for example to provide the PowerPoint or PDF file used for this video.")

    source_url = String(display_name="Source document URL",
                        default="",
                        scope=Scope.content,
                        help="Add a download link for the source file of your video. Use it for example to provide the PowerPoint or PDF file used for this video.")

    start_time = String(display_name="Start time",
                        default="",
                        scope=Scope.content,
                        help="The start and end time of your video. Equivalent to 'video.mp4#t=startTime,endTime' in the url.")

    end_time = String(display_name="End time",
                      default="",
                      scope=Scope.content,
                      help="The start and end time of your video. Equivalent to 'video.mp4#t=startTime,endTime' in the url.")

    sub_title_url = String(display_name="sub_title_url",
                           default="",
                           scope=Scope.content,
                           help="The link of subtitle.")

    '''
    Util functions
    '''

    def load_resource(self, resource_path):
        """
        Gets the content of a resource
        """
        resource_content = pkg_resources.resource_string(__name__, resource_path)
        return unicode(resource_content.decode('utf-8'))

    def render_template(self, template_path, context={}):
        """
        Evaluate a template by resource path, applying the provided context
        """
        template_str = self.load_resource(template_path)
        return Template(template_str).render(Context(context))

    '''
    Main functions
    '''

    def student_view(self, context=None):
        """
        The primary view of the XBlock, shown to students
        when viewing courses.
        """
        is_youtube = 'youtu' in self.url
        is_vimeo = 'vimeo' in self.url
        video_id = None

        if is_youtube:
            regex = '^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*'
            pattern = re.compile(regex)
            video_id = pattern.findall(self.url)[-1][-1]

        if is_vimeo:
            regex = '^.*(vimeo\.com\/)((channels\/[A-z]+\/)|(groups\/[A-z]+\/videos\/))?([0-9]+)'
            pattern = re.compile(regex)
            video_id = pattern.findall(self.url)[-1][-1]

        fullUrl = self.url
        if self.start_time != "" and self.end_time != "":
            fullUrl += "#t=" + self.start_time + "," + self.end_time
        elif self.start_time != "":
            fullUrl += "#t=" + self.start_time
        elif self.end_time != "":
            fullUrl += "#t=0," + self.end_time

        context = {
            'display_name': self.display_name,
            'display_description': self.display_description,
            'thumbnail_url': self.thumbnail_url,
            'url': fullUrl,
            'allow_download': self.allow_download,
            'source_text': self.source_text,
            'source_url': self.source_url,
            'sub_title_url': self.sub_title_url,
            'id': time.time(),
            'is_youtube': is_youtube,
            'is_vimeo': is_vimeo,
            'video_id': video_id
        }
        html = self.render_template('public/html/videojs_view.html', context)

        frag = Fragment(html)
        frag.add_css(self.load_resource("public/css/video-js.css"))
        frag.add_javascript(self.load_resource("public/js/video-js.min.js"))

        frag.add_css(self.load_resource("public/css/videojs.css"))

        frag.add_javascript(self.load_resource("public/js/videojs_view.js"))
        frag.initialize_js('videojsXBlockInitView')
        if is_youtube:
            frag.initialize_js('youtubeInit')
        if is_vimeo:
            frag.initialize_js('vimeoInit')

        return frag

    def studio_view(self, context=None):
        """
        The secondary view of the XBlock, shown to teachers
        when editing the XBlock.
        """
        context = {
            'display_name': self.display_name,
            'display_description': self.display_description,
            'url': self.url,
            'allow_download': self.allow_download,
            'source_text': self.source_text,
            'source_url': self.source_url,
            'start_time': self.start_time,
            'end_time': self.end_time,
            'sub_title_url': self.sub_title_url
        }
        html = self.render_template('public/html/videojs_edit.html', context)

        frag = Fragment(html)
        frag.add_javascript(self.load_resource("public/js/videojs_edit.js"))
        frag.add_resource_url(self.runtime.local_resource_url(self, 'public/img/loading.gif'), 'image/gif')
        frag.initialize_js('videojsXBlockInitStudio')
        return frag

    @XBlock.handler
    def save_videojs(self, request, suffix=''):
        """
        The saving handler.
        """
        data = request.POST

        self.display_name = data['display_name']
        self.display_description = data['display_description']
        self.url = data['url']
        self.allow_download = True if data['allow_download'] == "True" else False  # Str to Bool translation
        self.source_text = data['source_text']
        self.source_url = data['source_url']
        self.start_time = ''.join(data['start_time'].split())  # Remove whitespace
        self.end_time = ''.join(data['end_time'].split())  # Remove whitespace

        block_id = data['usage_id']

        if not isinstance(data['sub_title'], basestring):
            upload = data['sub_title']
            self.sub_title_url = self.upload_to_s3('SUBTITLES', upload.file, block_id, self.sub_title_url)

        if not isinstance(data['thumbnail'], basestring):
            upload = data['thumbnail']
            self.thumbnail_url = self.upload_to_s3('THUMBNAIL', upload.file, block_id, self.thumbnail_url)

        return Response(json_body={'result': 'success'})


    @XBlock.json_handler
    def tracking_log(self, data, suffix=''):
        msg = data['msg']
        type = data['type']
        self.runtime.publish(self, type, msg)
        return {
            'result': 'success'
        }

    @XBlock.handler
    def upload_video(self, request, suffix=''):
        data = request.POST

        block_id = data['usage_id']
        if not isinstance(data['fileupload'], basestring):
            upload = data['fileupload']
            url = self.upload_to_s3('VIDEO', upload.file, block_id, self.thumbnail_url)

        if url is not None:
            return Response(json_body={'result': 'success', 'url': url})

        else:
            return Response(json_body={'result': 'error'})
