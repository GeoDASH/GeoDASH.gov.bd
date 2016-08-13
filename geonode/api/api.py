# -*- coding: utf-8 -*-
#########################################################################
#
# Copyright (C) 2016 OSGeo
#
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
# GNU General Public License for more details.
#
# You should have received a copy of the GNU General Public License
# along with this program. If not, see <http://www.gnu.org/licenses/>.
#
#########################################################################

import json
import time
import os
import sys
import logging
import traceback
import shutil

from django.conf.urls import url
from django.contrib.auth import get_user_model
from django.core.urlresolvers import reverse
from django.contrib.contenttypes.models import ContentType
from django.conf import settings
from django.db.models import Count
from django.http import HttpResponse
from django.utils.html import escape
from django.shortcuts import get_object_or_404

from avatar.templatetags.avatar_tags import avatar_url
from guardian.shortcuts import get_objects_for_user
from slugify import slugify
from user_messages.models import UserThread

from geonode.base.models import ResourceBase
from geonode.base.models import TopicCategory
from geonode.base.models import Region
from geonode.layers.models import Layer
from geonode.maps.models import Map
from geonode.documents.models import Document
from geonode.groups.models import GroupProfile, GroupMember
from geonode.layers.forms import NewLayerUploadForm
from geonode.layers.utils import file_upload
from geonode.layers.models import UploadSession
from geonode.people.models import Profile
from geonode.settings import MEDIA_ROOT
from geonode.maps.models import WmsServer

from taggit.models import Tag
from django.core.serializers.json import DjangoJSONEncoder
from tastypie.serializers import Serializer
from tastypie import fields
from tastypie.resources import ModelResource
from tastypie.constants import ALL, ALL_WITH_RELATIONS
from tastypie.utils import trailing_slash

CONTEXT_LOG_FILE = None

if 'geonode.geoserver' in settings.INSTALLED_APPS:
    from geonode.geoserver.helpers import _render_thumbnail
    from geonode.geoserver.helpers import ogc_server_settings
    CONTEXT_LOG_FILE = ogc_server_settings.LOG_FILE


def log_snippet(log_file):
    if not os.path.isfile(log_file):
        return "No log file at %s" % log_file

logger = logging.getLogger("geonode.layers.views")


FILTER_TYPES = {
    'layer': Layer,
    'map': Map,
    'document': Document
}


class CountJSONSerializer(Serializer):
    """Custom serializer to post process the api and add counts"""

    def get_resources_counts(self, options):
        if settings.SKIP_PERMS_FILTER:
            resources = ResourceBase.objects.all()
        else:
            resources = get_objects_for_user(
                options['user'],
                'base.view_resourcebase'
            )
        if settings.RESOURCE_PUBLISHING:
            resources = resources.filter(is_published=True)

        if options['title_filter']:
            resources = resources.filter(title__icontains=options['title_filter'])

        if options['type_filter']:
            resources = resources.instance_of(options['type_filter'])

        counts = list(resources.values(options['count_type']).annotate(count=Count(options['count_type'])))

        return dict([(c[options['count_type']], c['count']) for c in counts])

    def to_json(self, data, options=None):
        options = options or {}
        data = self.to_simple(data, options)
        counts = self.get_resources_counts(options)
        if 'objects' in data:
            for item in data['objects']:
                item['count'] = counts.get(item['id'], 0)
        # Add in the current time.
        data['requested_time'] = time.time()

        return json.dumps(data, cls=DjangoJSONEncoder, sort_keys=True)


class TypeFilteredResource(ModelResource):
    """ Common resource used to apply faceting to categories, keywords, and
    regions based on the type passed as query parameter in the form
    type:layer/map/document"""

    count = fields.IntegerField()

    def build_filters(self, filters={}):
        self.type_filter = None
        self.title_filter = None

        orm_filters = super(TypeFilteredResource, self).build_filters(filters)

        if 'type' in filters and filters['type'] in FILTER_TYPES.keys():
            self.type_filter = FILTER_TYPES[filters['type']]
        else:
            self.type_filter = None
        if 'title__icontains' in filters:
            self.title_filter = filters['title__icontains']

        return orm_filters

    def serialize(self, request, data, format, options={}):
        options['title_filter'] = getattr(self, 'title_filter', None)
        options['type_filter'] = getattr(self, 'type_filter', None)
        options['user'] = request.user

        return super(TypeFilteredResource, self).serialize(request, data, format, options)


class TagResource(TypeFilteredResource):
    """Tags api"""

    def serialize(self, request, data, format, options={}):
        options['count_type'] = 'keywords'

        return super(TagResource, self).serialize(request, data, format, options)

    class Meta:
        queryset = Tag.objects.all().order_by('name')
        resource_name = 'keywords'
        allowed_methods = ['get']
        filtering = {
            'slug': ALL,
        }
        serializer = CountJSONSerializer()


class RegionResource(TypeFilteredResource):
    """Regions api"""

    def serialize(self, request, data, format, options={}):
        options['count_type'] = 'regions'

        return super(RegionResource, self).serialize(request, data, format, options)

    class Meta:
        queryset = Region.objects.all().order_by('name')
        resource_name = 'regions'
        allowed_methods = ['get']
        filtering = {
            'name': ALL,
            'code': ALL,
        }
        if settings.API_INCLUDE_REGIONS_COUNT:
            serializer = CountJSONSerializer()


class TopicCategoryResource(TypeFilteredResource):
    """Category api"""

    def serialize(self, request, data, format, options={}):
        options['count_type'] = 'category'

        return super(TopicCategoryResource, self).serialize(request, data, format, options)

    class Meta:
        queryset = TopicCategory.objects.all()
        resource_name = 'categories'
        allowed_methods = ['get']
        filtering = {
            'identifier': ALL,
        }
        serializer = CountJSONSerializer()


class GroupResource(ModelResource):
    """Groups api"""

    detail_url = fields.CharField()
    member_count = fields.IntegerField()
    manager_count = fields.IntegerField()

    def dehydrate_member_count(self, bundle):
        return bundle.obj.member_queryset().count()

    def dehydrate_manager_count(self, bundle):
        return bundle.obj.get_managers().count()

    def dehydrate_detail_url(self, bundle):
        return reverse('group_detail', args=[bundle.obj.slug])

    class Meta:
        queryset = GroupProfile.objects.all()
        resource_name = 'groups'
        allowed_methods = ['get']
        filtering = {
            'name': ALL
        }
        ordering = ['title', 'last_modified']


class ProfileResource(TypeFilteredResource):
    """Profile api"""

    avatar_100 = fields.CharField(null=True)
    profile_detail_url = fields.CharField()
    email = fields.CharField(default='')
    layers_count = fields.IntegerField(default=0)
    maps_count = fields.IntegerField(default=0)
    documents_count = fields.IntegerField(default=0)
    current_user = fields.BooleanField(default=False)
    activity_stream_url = fields.CharField(null=True)

    def build_filters(self, filters={}):
        """adds filtering by group functionality"""

        orm_filters = super(ProfileResource, self).build_filters(filters)

        if 'group' in filters:
            orm_filters['group'] = filters['group']

        return orm_filters

    def apply_filters(self, request, applicable_filters):
        """filter by group if applicable by group functionality"""

        group = applicable_filters.pop('group', None)

        semi_filtered = super(
            ProfileResource,
            self).apply_filters(
            request,
            applicable_filters)

        if group is not None:
            semi_filtered = semi_filtered.filter(
                groupmember__group__slug=group)

        return semi_filtered

    def dehydrate_email(self, bundle):
        email = ''
        if bundle.request.user.is_authenticated():
            email = bundle.obj.email
        return email

    def dehydrate_layers_count(self, bundle):
        obj_with_perms = get_objects_for_user(bundle.request.user,
                                              'base.view_resourcebase').instance_of(Layer)
        return bundle.obj.resourcebase_set.filter(id__in=obj_with_perms.values('id')).distinct().count()

    def dehydrate_maps_count(self, bundle):
        obj_with_perms = get_objects_for_user(bundle.request.user,
                                              'base.view_resourcebase').instance_of(Map)
        return bundle.obj.resourcebase_set.filter(id__in=obj_with_perms.values('id')).distinct().count()

    def dehydrate_documents_count(self, bundle):
        obj_with_perms = get_objects_for_user(bundle.request.user,
                                              'base.view_resourcebase').instance_of(Document)
        return bundle.obj.resourcebase_set.filter(id__in=obj_with_perms.values('id')).distinct().count()

    def dehydrate_avatar_100(self, bundle):
        return avatar_url(bundle.obj, 240)

    def dehydrate_profile_detail_url(self, bundle):
        return bundle.obj.get_absolute_url()

    def dehydrate_current_user(self, bundle):
        return bundle.request.user.username == bundle.obj.username

    def dehydrate_activity_stream_url(self, bundle):
        return reverse(
            'actstream_actor',
            kwargs={
                'content_type_id': ContentType.objects.get_for_model(
                    bundle.obj).pk,
                'object_id': bundle.obj.pk})

    def prepend_urls(self):
        if settings.HAYSTACK_SEARCH:
            return [
                url(r"^(?P<resource_name>%s)/search%s$" % (
                    self._meta.resource_name, trailing_slash()
                ),
                    self.wrap_view('get_search'), name="api_get_search"),
            ]
        else:
            return []

    def serialize(self, request, data, format, options={}):
        options['count_type'] = 'owner'

        return super(ProfileResource, self).serialize(request, data, format, options)

    def get_object_list(self, request):
        if request.user.is_superuser:
            return super(ProfileResource, self).get_object_list(request).exclude(is_staff=True)
        else:
            return super(ProfileResource, self).get_object_list(request).filter(is_active=True).exclude(is_staff=True)

    class Meta:
        queryset = get_user_model().objects.exclude(username='AnonymousUser')
        resource_name = 'profiles'
        allowed_methods = ['get']
        ordering = ['username', 'date_joined']
        excludes = ['is_staff', 'password', 'is_superuser',
                    'is_active', 'last_login']

        filtering = {
            'id': ALL,
            'username': ALL,
        }
        serializer = CountJSONSerializer()



class UserOrganizationList(TypeFilteredResource):

    group = fields.ForeignKey(GroupResource, 'group', full=True)
    user = fields.ForeignKey(ProfileResource, 'user')
    class Meta:
        queryset = GroupMember.objects.all()
        resource_name = 'user-organization-list'
        filtering = {
            'user': ALL_WITH_RELATIONS
        }



class OwnersResource(TypeFilteredResource):
    """Owners api, lighter and faster version of the profiles api"""

    def serialize(self, request, data, format, options={}):
        options['count_type'] = 'owner'

        return super(OwnersResource, self).serialize(request, data, format, options)

    class Meta:
        queryset = get_user_model().objects.exclude(username='AnonymousUser')
        resource_name = 'owners'
        allowed_methods = ['get']
        ordering = ['username', 'date_joined']
        excludes = ['is_staff', 'password', 'is_superuser',
                    'is_active', 'last_login']

        filtering = {
            'username': ALL,
        }
        serializer = CountJSONSerializer()


class LayerUpload(TypeFilteredResource):

    class Meta:
        resource_name = 'layerupload'
        allowed_methods = ['post']

    def dispatch(self, request_type, request, **kwargs):
        if request.method == 'POST':
            username = request.GET.get('username') or request.POST.get('username')
            password = request.GET.get('password') or request.POST.get('password')
            out = {'success': False}
            try:
                user = Profile.objects.get(username=username)
            except Profile.DoesNotExist:
                out['errors'] = 'The username and/or password you specified are not correct.'
                return HttpResponse(json.dumps(out), content_type='application/json', status=404)

            if user.check_password(password):
                request.user = user
            else:
                out['errors'] = 'The username and/or password you specified are not correct.'
                return HttpResponse(json.dumps(out), content_type='application/json', status=404)
            form = NewLayerUploadForm(request.POST, request.FILES)
            tempdir = None
            errormsgs = []
            if form.is_valid():
                title = form.cleaned_data["layer_title"]
                category = form.cleaned_data["category"]
                organization_id = form.cleaned_data["organization"]
                try:
                    group = GroupProfile.objects.get(id=organization_id)
                except GroupProfile.DoesNotExist:
                    out['errors'] = 'Organization does not exists'
                    return HttpResponse(json.dumps(out), content_type='application/json', status=404)
                else:
                    if not group in group.groups_for_user(request.user):
                        out['errors'] = 'Organization access denied'
                        return HttpResponse(json.dumps(out), content_type='application/json', status=404)
                # Replace dots in filename - GeoServer REST API upload bug
                # and avoid any other invalid characters.
                # Use the title if possible, otherwise default to the filename
                if title is not None and len(title) > 0:
                    name_base = title
                    keywords = title.split()
                else:
                    name_base, __ = os.path.splitext(
                        form.cleaned_data["base_file"].name)
                name = slugify(name_base.replace(".", "_"))
                try:
                    # Moved this inside the try/except block because it can raise
                    # exceptions when unicode characters are present.
                    # This should be followed up in upstream Django.
                    tempdir, base_file = form.write_files()
                    saved_layer = file_upload(
                        base_file,
                        name=name,
                        user=request.user,
                        category=category,
                        group=group,
                        keywords=keywords,
                        status='ACTIVE',
                        overwrite=False,
                        charset=form.cleaned_data["charset"],
                        abstract=form.cleaned_data["abstract"],
                        title=form.cleaned_data["layer_title"],
                        metadata_uploaded_preserve=form.cleaned_data["metadata_uploaded_preserve"]
                    )
                except Exception as e:
                    exception_type, error, tb = sys.exc_info()
                    logger.exception(e)
                    out['success'] = False
                    out['errors'] = str(error)
                    # Assign the error message to the latest UploadSession from that user.
                    latest_uploads = UploadSession.objects.filter(user=request.user).order_by('-date')
                    if latest_uploads.count() > 0:
                        upload_session = latest_uploads[0]
                        upload_session.error = str(error)
                        upload_session.traceback = traceback.format_exc(tb)
                        upload_session.context = log_snippet(CONTEXT_LOG_FILE)
                        upload_session.save()
                        out['traceback'] = upload_session.traceback
                        out['context'] = upload_session.context
                        out['upload_session'] = upload_session.id
                else:
                    out['success'] = True
                    if hasattr(saved_layer, 'info'):
                        out['info'] = saved_layer.info
                    out['url'] = reverse(
                        'layer_detail', args=[
                            saved_layer.service_typename])
                    upload_session = saved_layer.upload_session
                    upload_session.processed = True
                    upload_session.save()
                    permissions = form.cleaned_data["permissions"]
                    if permissions is not None and len(permissions.keys()) > 0:
                        saved_layer.set_permissions(permissions)
                finally:
                    if tempdir is not None:
                        shutil.rmtree(tempdir)
            else:
                for e in form.errors.values():
                    errormsgs.extend([escape(v) for v in e])
                out['errors'] = form.errors
                out['errormsgs'] = errormsgs
            if out['success']:
                status_code = 200
            else:
                status_code = 400
            return HttpResponse(json.dumps(out), content_type='application/json', status=status_code)


class MakeFeatured(TypeFilteredResource):

    class Meta:
        resource_name = 'make-featured'
        allowed_methods = ['post']

    def dispatch(self, request_type, request, **kwargs):
        if request.method == 'POST':
            out = {'success': False}
            user = request.user
            if user.is_authenticated() and user.is_superuser:
                status = json.loads(request.body).get('status')
                resource_id = json.loads(request.body).get('resource_id')

                try:
                    resource = ResourceBase.objects.get(pk=resource_id)
                except ResourceBase.DoesNotExist:
                    status_code = 404
                    out['errors'] = 'Layer does not exist'
                else:
                    resource.featured = status
                    resource.save()
                    out['success'] = 'True'
                    status_code = 200
            else:
                out['error'] = 'Access denied'
                out['success'] = False
                status_code = 400
            return HttpResponse(json.dumps(out), content_type='application/json', status=status_code)



class MesseagesUnread(TypeFilteredResource):

    class Meta:
        resource_name = 'message-unread'
        queryset = UserThread.objects.filter(unread=True)
        allowed_methods = ['get']

    def get_object_list(self, request):
            return super(MesseagesUnread, self).get_object_list(request).filter(user=request.user)


class MakeDocked(TypeFilteredResource):

    class Meta:
        resource_name = 'dockit'
        allowed_methods = ['post']

    def dispatch(self, request_type, request, **kwargs):
        if request.method == 'POST':
            out = {'success': False}
            user = request.user
            if user.is_authenticated():
                status = json.loads(request.body).get('status')
                resource_id = json.loads(request.body).get('resource_id')
                try:
                    resource = ResourceBase.objects.get(pk=resource_id)
                except ResourceBase.DoesNotExist:
                    status_code = 404
                    out['errors'] = 'resource does not exist'
                else:
                    resource.docked = status
                    resource.save()
                    out['success'] = 'True'
                    status_code = 200
            else:
                out['error'] = 'Access denied'
                out['success'] = False
                status_code = 400
            return HttpResponse(json.dumps(out), content_type='application/json', status=status_code)


class MakeFavorite(TypeFilteredResource):

    class Meta:
        resource_name = 'makefavorite'

    def dispatch(self, request_type, request, **kwargs):
        if request.method == 'POST':
            out = {'success': False}
            user = request.user
            if user.is_authenticated():
                status = json.loads(request.body).get('status')
                resource_id = json.loads(request.body).get('resource_id')

                try:
                    resource = ResourceBase.objects.get(pk=resource_id)
                except ResourceBase.DoesNotExist:
                    status_code = 404
                    out['errors'] = 'resource does not exist'
                else:
                    resource.docked = status
                    resource.favorite = status
                    resource.save()
                    out['success'] = 'True'
                    status_code = 200
            else:
                out['error'] = 'Access denied'
                out['success'] = False
                status_code = 400
            return HttpResponse(json.dumps(out), content_type='application/json', status=status_code)


class OsmOgrInfo(TypeFilteredResource):

    class Meta:
        resource_name = 'ogrinfo'
        allowed_methods = ['post']

    def dispatch(self, request_type, request, **kwargs):
        if request.method == 'POST':
            out = {'success': False}
            user = request.user
            if user.is_authenticated():
                try:
                    file = request.FILES["base_file"]
                except:
                    out['errors'] = 'No file has been choosen as base_file'
                    return HttpResponse(json.dumps(out), content_type='application/json', status=404)
                else:
                    filename = file.name
                    extension = os.path.splitext(filename)[1]
                    if extension.lower() != '.osm':
                        out['errors'] = 'Please upload a valid .osm file'
                        return HttpResponse(json.dumps(out), content_type='application/json', status=404)

                    file_location = os.path.join(MEDIA_ROOT, "osm_temp")
                    temporary_file = open('%s/%s' % (file_location, filename), 'w+')
                    temporary_file.write(file.read())
                    temporary_file.close()
                    file_path = temporary_file.name
                    from plumbum.cmd import ogrinfo
                    output_string = ogrinfo(file_path)
                    point_layer = '(Point)'
                    line_layer = '(Line String)'
                    multi_line_layer = '(Multi Line String)'
                    multipolygon_layer = '(Geometry Collection)'
                    if point_layer in output_string:
                        out['points'] = 'points'
                    if line_layer in output_string:
                        out['lines'] = 'lines'
                    if multi_line_layer in output_string:
                        out['multilinestrings'] = 'multilinestrings'
                    if multipolygon_layer in output_string:
                        out['multipolygons'] = 'multipolygons'
                    out['success'] = True

                    os.remove(file_path)
                    return HttpResponse(json.dumps(out), content_type='application/json', status=200)



class LayerSource(TypeFilteredResource):
    """
    api for retrieving server info for layer source
    """

    class Meta:
        resource_name = 'layersource'
        allowed_methods = ['get']
        queryset = WmsServer.objects.all()


class MakeFavoriteGroup(TypeFilteredResource):

    class Meta:
        resource_name = 'makefavoritegroup'

    def dispatch(self, request_type, request, **kwargs):
        if request.method == 'POST':
            out = {'success': False}
            user = request.user
            if user.is_authenticated():
                status = json.loads(request.body).get('status')
                group_id = json.loads(request.body).get('group_id')

                try:
                    group = GroupProfile.objects.get(pk=group_id)
                except GroupProfile.DoesNotExist:
                    status_code = 404
                    out['errors'] = 'Organization does not exist'
                else:
                    group.docked = status
                    group.favorite = status
                    group.save()
                    out['success'] = 'True'
                    status_code = 200
            else:
                out['error'] = 'Access denied'
                out['success'] = False
                status_code = 400
            return HttpResponse(json.dumps(out), content_type='application/json', status=status_code)


class MakeDockedGroup(TypeFilteredResource):

    class Meta:
        resource_name = 'dockitgroup'
        allowed_methods = ['post']

    def dispatch(self, request_type, request, **kwargs):
        if request.method == 'POST':
            out = {'success': False}
            user = request.user
            if user.is_authenticated():
                status = json.loads(request.body).get('status')
                group_id = json.loads(request.body).get('group_id')
                try:
                    group = GroupProfile.objects.get(pk=group_id)
                except GroupProfile.DoesNotExist:
                    status_code = 404
                    out['errors'] = 'group does not exist'
                else:
                    group.docked = status
                    group.save()
                    out['success'] = 'True'
                    status_code = 200
            else:
                out['error'] = 'Access denied'
                out['success'] = False
                status_code = 400
            return HttpResponse(json.dumps(out), content_type='application/json', status=status_code)
