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

import math
import logging
from guardian.shortcuts import get_perms
import requests as req

from django.contrib.auth.decorators import login_required
from django.core.exceptions import ObjectDoesNotExist
from django.core.urlresolvers import reverse
from django.core.serializers.json import DjangoJSONEncoder
from django.http import HttpResponse, HttpResponseRedirect, HttpResponseNotAllowed, HttpResponseServerError
from django.shortcuts import render_to_response, get_object_or_404
from django.conf import settings
from django.template import RequestContext
from django.utils.translation import ugettext as _
from django.template import RequestContext, loader
from django.views.decorators.csrf import csrf_exempt


try:
    # Django >= 1.7
    import json
except ImportError:
    # Django <= 1.6 backwards compatibility
    from django.utils import simplejson as json
from django.utils.html import strip_tags
from django.db.models import F
from django.views.decorators.clickjacking import xframe_options_exempt
from django.contrib import messages
from django.views.generic.list import ListView
from django.views.generic.edit import CreateView, UpdateView, DeleteView

from notify.signals import notify
from pyproj import Proj, transform

from geonode.layers.models import Layer
from geonode.maps.models import Map, MapLayer, MapSnapshot
from geonode.layers.views import _resolve_layer
from geonode.utils import forward_mercator, llbbox_to_mercator
from geonode.utils import DEFAULT_TITLE
from geonode.utils import DEFAULT_ABSTRACT
from geonode.utils import default_map_config
from geonode.utils import resolve_object
from geonode.utils import layer_from_viewer_config
from geonode.maps.forms import MapForm
from geonode.security.views import _perms_info_json
from geonode.base.forms import CategoryForm, ResourceApproveForm, ResourceDenyForm
from geonode.base.models import TopicCategory
from geonode.tasks.deletion import delete_map

from geonode.documents.models import get_related_documents
from geonode.people.forms import ProfileForm
from geonode.utils import num_encode, num_decode
from geonode.utils import build_social_links
import urlparse

from geonode.maps.models import MapSubmissionActivity, MapAuditActivity
from geonode.groups.models import GroupProfile
from geonode.maps.models import WmsServer
from geonode.maps.forms import WmsServerForm

from rest_framework.generics import RetrieveUpdateAPIView
from .serializers import MapLayerSerializer
from rest_framework.response import Response
from rest_framework.parsers import JSONParser
from rest_framework import permissions

if 'geonode.geoserver' in settings.INSTALLED_APPS:
    # FIXME: The post service providing the map_status object
    # should be moved to geonode.geoserver.
    from geonode.geoserver.helpers import ogc_server_settings

    # Use the http_client with one that knows the username
    # and password for GeoServer's management user.
    from geonode.geoserver.helpers import http_client, _render_thumbnail
else:
    from geonode.utils import http_client

logger = logging.getLogger("geonode.maps.views")

DEFAULT_MAPS_SEARCH_BATCH_SIZE = 10
MAX_MAPS_SEARCH_BATCH_SIZE = 25

_PERMISSION_MSG_DELETE = _("You are not permitted to delete this map.")
_PERMISSION_MSG_GENERIC = _('You do not have permissions for this map.')
_PERMISSION_MSG_LOGIN = _("You must be logged in to save this map")
_PERMISSION_MSG_SAVE = _("You are not permitted to save or edit this map.")
_PERMISSION_MSG_METADATA = _(
    "You are not allowed to modify this map's metadata.")
_PERMISSION_MSG_VIEW = _("You are not allowed to view this map.")
_PERMISSION_MSG_UNKNOWN = _('An unknown error has occured.')


def _resolve_map(request, id, permission='base.change_resourcebase',
                 msg=_PERMISSION_MSG_GENERIC, **kwargs):
    '''
    Resolve the Map by the provided typename and check the optional permission.
    '''
    if id.isdigit():
        key = 'pk'
    else:
        key = 'urlsuffix'
    return resolve_object(request, Map, {key: id}, permission=permission,
                          permission_msg=msg, **kwargs)


# BASIC MAP VIEWS #

def map_detail(request, mapid, snapshot=None, template='maps/map_detail.html'):
    '''
    The view that show details of each map
    '''

    try:
        user_role = request.GET['user_role']
    except:
        user_role=None

    map_obj = _resolve_map(request, mapid, 'base.view_resourcebase', _PERMISSION_MSG_VIEW)

    # Update count for popularity ranking,
    # but do not includes admins or resource owners
    if request.user != map_obj.owner and not request.user.is_superuser:
        Map.objects.filter(id=map_obj.id).update(popular_count=F('popular_count') + 1)

    if 'access_token' in request.session:
        access_token = request.session['access_token']
    else:
        access_token = None

    if snapshot is None:
        config = map_obj.viewer_json(request.user, access_token)
    else:
        config = snapshot_config(snapshot, map_obj, request.user, access_token)

    # check if any cql_filter is sent from the user
    # filter_map method returns config after adding filter
    if request.GET.get('layers'):
        config = filter_map(request, config)
    config = json.dumps(config)
    layers = MapLayer.objects.filter(map=map_obj.id)
    approve_form = ResourceApproveForm()
    deny_form = ResourceDenyForm()

    context_dict = {
        'config': config,
        'resource': map_obj,
        'layers': layers,
        'perms_list': get_perms(request.user, map_obj.get_self_resource()),
        'permissions_json': _perms_info_json(map_obj),
        "documents": get_related_documents(map_obj),
        "user_role": user_role,
        "status": map_obj.status,
        "approve_form": approve_form,
        "deny_form": deny_form,
        "denied_comments": MapAuditActivity.objects.filter(map_submission_activity__map=map_obj),

    }

    context_dict["preview"] = getattr(
        settings,
        'LAYER_PREVIEW_LIBRARY',
        '')
    context_dict["crs"] = getattr(
        settings,
        'DEFAULT_MAP_CRS',
        'EPSG:900913')

    if settings.SOCIAL_ORIGINS:
        context_dict["social_links"] = build_social_links(request, map_obj)

    return render_to_response(template, RequestContext(request, context_dict))


@login_required
def map_metadata(request, mapid, template='maps/map_metadata.html'):

    map_obj = _resolve_map(request, mapid, 'base.change_resourcebase_metadata', _PERMISSION_MSG_VIEW)

    poc = map_obj.poc

    metadata_author = map_obj.metadata_author

    topic_category = map_obj.category

    if request.method == "POST":
        map_form = MapForm(request.POST, instance=map_obj, prefix="resource")
        category_form = CategoryForm(
            request.POST,
            prefix="category_choice_field",
            initial=int(
                request.POST["category_choice_field"]) if "category_choice_field" in request.POST else None)
    else:
        map_form = MapForm(instance=map_obj, prefix="resource")
        category_form = CategoryForm(
            prefix="category_choice_field",
            initial=topic_category.id if topic_category else None)

    if request.method == "POST" and map_form.is_valid(
    ) and category_form.is_valid():
        new_poc = map_form.cleaned_data['poc']
        new_author = map_form.cleaned_data['metadata_author']
        new_keywords = map_form.cleaned_data['keywords']
        new_title = strip_tags(map_form.cleaned_data['title'])
        new_abstract = strip_tags(map_form.cleaned_data['abstract'])
        new_category = TopicCategory.objects.get(
            id=category_form.cleaned_data['category_choice_field'])

        if new_poc is None:
            if poc is None:
                poc_form = ProfileForm(
                    request.POST,
                    prefix="poc",
                    instance=poc)
            else:
                poc_form = ProfileForm(request.POST, prefix="poc")
            if poc_form.has_changed and poc_form.is_valid():
                new_poc = poc_form.save()

        if new_author is None:
            if metadata_author is None:
                author_form = ProfileForm(request.POST, prefix="author",
                                          instance=metadata_author)
            else:
                author_form = ProfileForm(request.POST, prefix="author")
            if author_form.has_changed and author_form.is_valid():
                new_author = author_form.save()

        if new_poc is not None and new_author is not None:
            the_map = map_form.save()
            the_map.poc = new_poc
            the_map.metadata_author = new_author
            the_map.title = new_title
            the_map.abstract = new_abstract
            the_map.save()
            the_map.keywords.clear()
            the_map.keywords.add(*new_keywords)
            the_map.category = new_category
            the_map.save()

            if getattr(settings, 'SLACK_ENABLED', False):
                try:
                    from geonode.contrib.slack.utils import build_slack_message_map, send_slack_messages
                    send_slack_messages(build_slack_message_map("map_edit", the_map))
                except:
                    print "Could not send slack message for modified map."

            return HttpResponseRedirect(
                reverse(
                    'map_detail',
                    args=(
                        map_obj.id,
                    )))

    if poc is None:
        poc_form = ProfileForm(request.POST, prefix="poc")
    else:
        if poc is None:
            poc_form = ProfileForm(instance=poc, prefix="poc")
        else:
            map_form.fields['poc'].initial = poc.id
            poc_form = ProfileForm(prefix="poc")
            poc_form.hidden = True

    if metadata_author is None:
        author_form = ProfileForm(request.POST, prefix="author")
    else:
        if metadata_author is None:
            author_form = ProfileForm(
                instance=metadata_author,
                prefix="author")
        else:
            map_form.fields['metadata_author'].initial = metadata_author.id
            author_form = ProfileForm(prefix="author")
            author_form.hidden = True

    return render_to_response(template, RequestContext(request, {
        "map": map_obj,
        "map_form": map_form,
        "poc_form": poc_form,
        "author_form": author_form,
        "category_form": category_form,
    }))


@login_required
def map_remove(request, mapid, template='maps/map_remove.html'):
    ''' Delete a map, and its constituent layers. '''
    map_obj = _resolve_map(request, mapid, 'base.delete_resourcebase', _PERMISSION_MSG_VIEW)

    if request.method == 'GET':
        return render_to_response(template, RequestContext(request, {
            "map": map_obj
        }))

    elif request.method == 'POST':

        if getattr(settings, 'SLACK_ENABLED', False):

            slack_message = None
            try:
                from geonode.contrib.slack.utils import build_slack_message_map
                slack_message = build_slack_message_map("map_delete", map_obj)
            except:
                print "Could not build slack message for delete map."

            delete_map.delay(object_id=map_obj.id)
            # notify map owner that someone have deleted the map
            if request.user != map_obj.owner:
                recipient = map_obj.owner
                notify.send(request.user, recipient=recipient, actor=request.user,
                target=map_obj, verb='deleted your map')

            try:
                from geonode.contrib.slack.utils import send_slack_messages
                send_slack_messages(slack_message)
            except:
                print "Could not send slack message for delete map."

        else:
            delete_map.delay(object_id=map_obj.id)
            # notify map owner that someone have deleted the map
            if request.user != map_obj.owner:
                recipient = map_obj.owner
                notify.send(request.user, recipient=recipient, actor=request.user,
                target=map_obj, verb='deleted your map')

        return HttpResponseRedirect(reverse("maps_browse"))


@xframe_options_exempt
def map_embed(
        request,
        mapid=None,
        snapshot=None,
        template='maps/map_embed.html'):
    if mapid is None:
        config = default_map_config(request)[0]
    else:
        map_obj = _resolve_map(request, mapid, 'base.view_resourcebase', _PERMISSION_MSG_VIEW)

        if 'access_token' in request.session:
            access_token = request.session['access_token']
        else:
            access_token = None

        if snapshot is None:
            config = map_obj.viewer_json(request.user, access_token)
        else:
            config = snapshot_config(snapshot, map_obj, request.user, access_token)

    return render_to_response(template, RequestContext(request, {
        'config': json.dumps(config)
    }))


# MAPS VIEWER #

# detail_map_view
def map_view(request, mapid, snapshot=None, template='maps/detail_map_view.html'):
    """
    The view that returns the map composer opened to
    the map with the given map ID.
    """
    map_obj = _resolve_map(request, mapid, 'base.view_resourcebase', _PERMISSION_MSG_VIEW)

    if 'access_token' in request.session:
        access_token = request.session['access_token']
    else:
        access_token = None

    if snapshot is None:
        config = map_obj.viewer_json(request.user, access_token)
    else:
        config = snapshot_config(snapshot, map_obj, request.user, access_token)

    return render_to_response(template, RequestContext(request, {
        'config': json.dumps(config),
        'access_token': access_token,
        'map': map_obj,
        'preview': getattr(
            settings,
            'LAYER_PREVIEW_LIBRARY',
            '')
    }))


def map_view_js(request, mapid):
    map_obj = _resolve_map(request, mapid, 'base.view_resourcebase', _PERMISSION_MSG_VIEW)
    if 'access_token' in request.session:
        access_token = request.session['access_token']
    else:
        access_token = None

    config = map_obj.viewer_json(request.user, access_token)
    return HttpResponse(json.dumps(config), content_type="application/javascript")


def map_json(request, mapid, snapshot=None):
    if request.method == 'GET':
        map_obj = _resolve_map(request, mapid, 'base.view_resourcebase', _PERMISSION_MSG_VIEW)
        if 'access_token' in request.session:
            access_token = request.session['access_token']
        else:
            access_token = None

        return HttpResponse(json.dumps(map_obj.viewer_json(request.user, access_token)))
    elif request.method == 'PUT':
        if not request.user.is_authenticated():
            return HttpResponse(
                _PERMISSION_MSG_LOGIN,
                status=401,
                content_type="text/plain"
            )

        map_obj = Map.objects.get(id=mapid)
        if not request.user.has_perm('change_resourcebase', map_obj.get_self_resource()):
            return HttpResponse(
                _PERMISSION_MSG_SAVE,
                status=401,
                content_type="text/plain"
            )
        try:
            map_obj.update_from_viewer(request.body)
            MapSnapshot.objects.create(
                config=clean_config(
                    request.body),
                map=map_obj,
                user=request.user)

            if 'access_token' in request.session:
                access_token = request.session['access_token']
            else:
                access_token = None

            return HttpResponse(json.dumps(map_obj.viewer_json(request.user, access_token)))
        except ValueError as e:
            return HttpResponse(
                "The server could not understand the request." + str(e),
                content_type="text/plain",
                status=400
            )


def map_edit(request, mapid, snapshot=None, template='maps/map_edit.html'):
    """
    The view that returns the map composer opened to
    the map with the given map ID.
    """
    map_obj = _resolve_map(request, mapid, 'base.view_resourcebase', _PERMISSION_MSG_VIEW)

    if 'access_token' in request.session:
        access_token = request.session['access_token']
    else:
        access_token = None

    if snapshot is None:
        config = map_obj.viewer_json(request.user, access_token)
    else:
        config = snapshot_config(snapshot, map_obj, request.user, access_token)

    return render_to_response(template, RequestContext(request, {
        'mapId': mapid,
        'config': json.dumps(config),
        'map': map_obj,
        'preview': getattr(
            settings,
            'LAYER_PREVIEW_LIBRARY',
            '')
    }))


# NEW MAPS #


def clean_config(conf):
    if isinstance(conf, basestring):
        config = json.loads(conf)
        config_extras = [
            "tools",
            "rest",
            "homeUrl",
            "localGeoServerBaseUrl",
            "localCSWBaseUrl",
            "csrfToken",
            "db_datastore",
            "authorizedRoles"]
        for config_item in config_extras:
            if config_item in config:
                del config[config_item]
            if config_item in config["map"]:
                del config["map"][config_item]
        return json.dumps(config)
    else:
        return conf


def new_map(request, template='maps/map_new.html'):
    config = new_map_config(request)
    context_dict = {
        'config': config,
    }
    context_dict["preview"] = getattr(
        settings,
        'LAYER_PREVIEW_LIBRARY',
        '')
    if isinstance(config, HttpResponse):
        return config
    else:
        return render_to_response(template, RequestContext(request, context_dict))

def old_map(request, template='maps/map_view.html'):
    return new_map(request, template);

def new_map_json(request):

    if request.method == 'GET':
        config = new_map_config(request)
        if isinstance(config, HttpResponse):
            return config
        else:
            return HttpResponse(config)

    elif request.method == 'POST':
        if not request.user.is_authenticated():
            return HttpResponse(
                'You must be logged in to save new maps',
                content_type="text/plain",
                status=401
            )
        data = json.loads(request.body)
        title = data['about']['title']
        category_id = int(data['about']['category'])
        organization_id = int(data['about']['organization'])
        group = GroupProfile.objects.get(id=organization_id)


        map_obj = Map(owner=request.user, zoom=0,
                      center_x=0, center_y=0,
                      category=TopicCategory.objects.get(id=category_id), group=group, title=title)
        map_obj.save()
        map_obj.set_default_permissions()

        permissions = _perms_info_json(map_obj)
        perm_dict = json.loads(permissions)
        if 'download_resourcebase' in perm_dict['groups']['anonymous']:
            perm_dict['groups']['anonymous'].remove('download_resourcebase')
        if 'view_resourcebase' in perm_dict['groups']['anonymous']:
            perm_dict['groups']['anonymous'].remove('view_resourcebase')
        #
        map_obj.set_permissions(perm_dict)

        # If the body has been read already, use an empty string.
        # See https://github.com/django/django/commit/58d555caf527d6f1bdfeab14527484e4cca68648
        # for a better exception to catch when we move to Django 1.7.
        try:
            body = request.body
        except Exception:
            body = ''

        try:
            map_obj.update_from_viewer(body)

            # notify layer owners that this layer is used to create this map
            layers = map_obj.layers
            layer_owners = [layer.owner for layer in map_obj.local_layers]
            notify.send(request.user, recipient_list=layer_owners, actor=request.user,
                verb='created map using your layer', target=map_obj)

            MapSnapshot.objects.create(
                config=clean_config(body),
                map=map_obj,
                user=request.user)
        except ValueError as e:
            return HttpResponse(str(e), status=400)
        else:
            return HttpResponse(
                json.dumps({'id': map_obj.id}),
                status=200,
                content_type='application/json'
            )
    else:
        return HttpResponse(status=405)


def new_map_config(request):
    '''
    View that creates a new map.

    If the query argument 'copy' is given, the initial map is
    a copy of the map with the id specified, otherwise the
    default map configuration is used.  If copy is specified
    and the map specified does not exist a 404 is returned.
    '''
    DEFAULT_MAP_CONFIG, DEFAULT_BASE_LAYERS = default_map_config(request)

    if 'access_token' in request.session:
        access_token = request.session['access_token']
    else:
        access_token = None
    
    if request.method == 'GET' and 'copy' in request.GET:
        mapid = request.GET['copy']
        map_obj = _resolve_map(request, mapid, 'base.view_resourcebase')

        map_obj.abstract = DEFAULT_ABSTRACT
        map_obj.title = DEFAULT_TITLE
        if request.user.is_authenticated():
            map_obj.owner = request.user

        config = map_obj.viewer_json(request.user, access_token)
        del config['id']
    else:
        if request.method == 'GET':
            params = request.GET
        elif request.method == 'POST':
            params = request.POST
        else:
            return HttpResponse(status=405)

        if 'layer' in params:
            bbox = None
            map_obj = Map(projection=getattr(settings, 'DEFAULT_MAP_CRS',
                          'EPSG:900913'))
            layers = []
            for layer_name in params.getlist('layer'):
                try:
                    layer = _resolve_layer(request, layer_name)
                except ObjectDoesNotExist:
                    # bad layer, skip
                    continue

                if not request.user.has_perm(
                        'view_resourcebase',
                        obj=layer.get_self_resource()):
                    # invisible layer, skip inclusion
                    continue

                layer_bbox = layer.bbox
                # assert False, str(layer_bbox)
                if bbox is None:
                    bbox = list(layer_bbox[0:4])
                else:
                    bbox[0] = min(bbox[0], layer_bbox[0])
                    bbox[1] = max(bbox[1], layer_bbox[1])
                    bbox[2] = min(bbox[2], layer_bbox[2])
                    bbox[3] = max(bbox[3], layer_bbox[3])

                config = layer.attribute_config()

                # Add required parameters for GXP lazy-loading
                config["title"] = layer.title
                config["queryable"] = True

                config["srs"] = getattr(settings, 'DEFAULT_MAP_CRS', 'EPSG:900913')
                config["bbox"] = bbox if config["srs"] != 'EPSG:900913' \
                    else llbbox_to_mercator([float(coord) for coord in bbox])

                if layer.storeType == "remoteStore":
                    service = layer.service
                    # Probably not a good idea to send the access token to every remote service.
                    # This should never match, so no access token should be sent to remote services.
                    ogc_server_url = urlparse.urlsplit(ogc_server_settings.PUBLIC_LOCATION).netloc
                    service_url = urlparse.urlsplit(service.base_url).netloc

                    if access_token and ogc_server_url == service_url and 'access_token' not in service.base_url:
                        url = service.base_url+'?access_token='+access_token
                    else:
                        url = service.base_url
                    maplayer = MapLayer(map=map_obj,
                                        name=layer.typename,
                                        ows_url=layer.ows_url,
                                        layer_params=json.dumps(config),
                                        visibility=True,
                                        source_params=json.dumps({
                                            "ptype": service.ptype,
                                            "remote": True,
                                            "url": url,
                                            "name": service.name}))
                else:
                    ogc_server_url = urlparse.urlsplit(ogc_server_settings.PUBLIC_LOCATION).netloc
                    layer_url = urlparse.urlsplit(layer.ows_url).netloc

                    if access_token and ogc_server_url == layer_url and 'access_token' not in layer.ows_url:
                        url = layer.ows_url+'?access_token='+access_token
                    else:
                        url = layer.ows_url
                    maplayer = MapLayer(
                        map=map_obj,
                        name=layer.typename,
                        ows_url=url,
                        # use DjangoJSONEncoder to handle Decimal values
                        layer_params=json.dumps(config, cls=DjangoJSONEncoder),
                        visibility=True
                    )

                layers.append(maplayer)

            if bbox is not None:
                minx, miny, maxx, maxy = [float(coord) for coord in bbox]
                x = (minx + maxx) / 2
                y = (miny + maxy) / 2

                if getattr(settings, 'DEFAULT_MAP_CRS', 'EPSG:900913') == "EPSG:4326":
                    center = list((x, y))
                else:
                    center = list(forward_mercator((x, y)))

                if center[1] == float('-inf'):
                    center[1] = 0

                BBOX_DIFFERENCE_THRESHOLD = 1e-5

                # Check if the bbox is invalid
                valid_x = (maxx - minx) ** 2 > BBOX_DIFFERENCE_THRESHOLD
                valid_y = (maxy - miny) ** 2 > BBOX_DIFFERENCE_THRESHOLD

                if valid_x:
                    width_zoom = math.log(360 / abs(maxx - minx), 2)
                else:
                    width_zoom = 15

                if valid_y:
                    height_zoom = math.log(360 / abs(maxy - miny), 2)
                else:
                    height_zoom = 15

                map_obj.center_x = center[0]
                map_obj.center_y = center[1]
                map_obj.zoom = math.ceil(min(width_zoom, height_zoom))

            config = map_obj.viewer_json(
                request.user, access_token, *(DEFAULT_BASE_LAYERS + layers))
            config['fromLayer'] = True
        else:
            config = DEFAULT_MAP_CONFIG
            
    config.update(dict(access_token=access_token))
        
    return json.dumps(config)


# MAPS DOWNLOAD #

def map_download(request, mapid, template='maps/map_download.html'):
    """
    Download all the layers of a map as a batch
    XXX To do, remove layer status once progress id done
    This should be fix because
    """
    map_obj = _resolve_map(request, mapid, 'base.download_resourcebase', _PERMISSION_MSG_VIEW)

    map_status = dict()
    if request.method == 'POST':
        url = "%srest/process/batchDownload/launch/" % ogc_server_settings.LOCATION

        def perm_filter(layer):
            return request.user.has_perm(
                'base.view_resourcebase',
                obj=layer.get_self_resource())

        mapJson = map_obj.json(perm_filter)

        # we need to remove duplicate layers
        j_map = json.loads(mapJson)
        j_layers = j_map["layers"]
        for j_layer in j_layers:
            if j_layer["service"] is None:
                j_layers.remove(j_layer)
                continue
            if(len([l for l in j_layers if l == j_layer])) > 1:
                j_layers.remove(j_layer)
        mapJson = json.dumps(j_map)

        resp, content = http_client.request(url, 'POST', body=mapJson)

        status = int(resp.status)

        if status == 200:
            map_status = json.loads(content)
            request.session["map_status"] = map_status
        else:
            raise Exception(
                'Could not start the download of %s. Error was: %s' %
                (map_obj.title, content))

    locked_layers = []
    remote_layers = []
    downloadable_layers = []

    for lyr in map_obj.layer_set.all():
        if lyr.group != "background":
            if not lyr.local:
                remote_layers.append(lyr)
            else:
                ownable_layer = Layer.objects.get(typename=lyr.name)
                if not request.user.has_perm(
                        'download_resourcebase',
                        obj=ownable_layer.get_self_resource()):
                    locked_layers.append(lyr)
                else:
                    # we need to add the layer only once
                    if len(
                            [l for l in downloadable_layers if l.name == lyr.name]) == 0:
                        downloadable_layers.append(lyr)

    return render_to_response(template, RequestContext(request, {
        "geoserver": ogc_server_settings.PUBLIC_LOCATION,
        "map_status": map_status,
        "map": map_obj,
        "locked_layers": locked_layers,
        "remote_layers": remote_layers,
        "downloadable_layers": downloadable_layers,
        "site": settings.SITEURL
    }))


def map_download_check(request):
    """
    this is an endpoint for monitoring map downloads
    """
    try:
        layer = request.session["map_status"]
        if isinstance(layer, dict):
            url = "%srest/process/batchDownload/status/%s" % (
                ogc_server_settings.LOCATION, layer["id"])
            resp, content = http_client.request(url, 'GET')
            status = resp.status
            if resp.status == 400:
                return HttpResponse(
                    content="Something went wrong",
                    status=status)
        else:
            content = "Something Went wrong"
            status = 400
    except ValueError:
        # TODO: Is there any useful context we could include in this log?
        logger.warn(
            "User tried to check status, but has no download in progress.")
    return HttpResponse(content=content, status=status)


def map_wmc(request, mapid, template="maps/wmc.xml"):
    """Serialize an OGC Web Map Context Document (WMC) 1.1"""
    map_obj = _resolve_map(request, mapid, 'base.view_resourcebase', _PERMISSION_MSG_VIEW)

    return render_to_response(template, RequestContext(request, {
        'map': map_obj,
        'siteurl': settings.SITEURL,
    }), content_type='text/xml')


def map_wms(request, mapid):
    """
    Publish local map layers as group layer in local OWS.

    /maps/:id/wms

    GET: return endpoint information for group layer,
    PUT: update existing or create new group layer.
    """
    map_obj = _resolve_map(request, mapid, 'base.view_resourcebase', _PERMISSION_MSG_VIEW)

    if request.method == 'PUT':
        try:
            layerGroupName = map_obj.publish_layer_group()
            response = dict(
                layerGroupName=layerGroupName,
                ows=getattr(ogc_server_settings, 'ows', ''),
            )
            return HttpResponse(
                json.dumps(response),
                content_type="application/json")
        except:
            return HttpResponseServerError()

    if request.method == 'GET':
        response = dict(
            layerGroupName=getattr(map_obj.layer_group, 'name', ''),
            ows=getattr(ogc_server_settings, 'ows', ''),
        )
        return HttpResponse(json.dumps(response), content_type="application/json")

    return HttpResponseNotAllowed(['PUT', 'GET'])


def maplayer_attributes(request, layername):
    # Return custom layer attribute labels/order in JSON format
    layer = Layer.objects.get(typename=layername)
    return HttpResponse(
        json.dumps(
            layer.attribute_config()),
        content_type="application/json")


def snapshot_config(snapshot, map_obj, user, access_token):
    """
        Get the snapshot map configuration - look up WMS parameters (bunding box)
        for local GeoNode layers
    """
    # Match up the layer with it's source
    def snapsource_lookup(source, sources):
        for k, v in sources.iteritems():
            if v.get("id") == source.get("id"):
                return k
        return None

    # Set up the proper layer configuration
    def snaplayer_config(layer, sources, user, access_token):
        cfg = layer.layer_config()
        src_cfg = layer.source_config()
        source = snapsource_lookup(src_cfg, sources)
        if source:
            cfg["source"] = source
        if src_cfg.get(
                "ptype",
                "gxp_wmscsource") == "gxp_wmscsource" or src_cfg.get(
                "ptype",
                "gxp_gnsource") == "gxp_gnsource":
            cfg["buffer"] = 0
        return cfg

    decodedid = num_decode(snapshot)
    snapshot = get_object_or_404(MapSnapshot, pk=decodedid)
    if snapshot.map == map_obj.map:
        config = json.loads(clean_config(snapshot.config))
        layers = [l for l in config["map"]["layers"]]
        sources = config["sources"]
        maplayers = []
        for ordering, layer in enumerate(layers):
            maplayers.append(
                layer_from_viewer_config(
                    MapLayer,
                    layer,
                    config["sources"][
                        layer["source"]],
                    ordering))
#             map_obj.map.layer_set.from_viewer_config(
# map_obj, layer, config["sources"][layer["source"]], ordering))
        config['map']['layers'] = [
            snaplayer_config(
                l,
                sources,
                user,
                access_token) for l in maplayers]
    else:
        config = map_obj.viewer_json(user, access_token)
    return config


def get_suffix_if_custom(map):
    if map.use_custom_template:
        if map.featuredurl:
            return map.featuredurl
        elif map.urlsuffix:
            return map.urlsuffix
        else:
            return None
    else:
        return None


def featured_map(request, site):
    """
    The view that returns the map composer opened to
    the map with the given official site url.
    """
    map_obj = resolve_object(request, Map, {'featuredurl': site}, permission='base.view_resourcebase',
                             permission_msg=_PERMISSION_MSG_VIEW)
    return map_view(request, str(map_obj.id))


def featured_map_info(request, site):
    '''
    main view for map resources, dispatches to correct
    view based on method and query args.
    '''
    map_obj = resolve_object(request, Map, {'featuredurl': site}, permission='base.view_resourcebase',
                             permission_msg=_PERMISSION_MSG_VIEW)
    return map_detail(request, str(map_obj.id))


def snapshot_create(request):
    """
    Create a permalinked map
    """
    conf = request.body

    if isinstance(conf, basestring):
        config = json.loads(conf)
        snapshot = MapSnapshot.objects.create(
            config=clean_config(conf),
            map=Map.objects.get(
                id=config['id']))
        return HttpResponse(num_encode(snapshot.id), content_type="text/plain")
    else:
        return HttpResponse("Invalid JSON", content_type="text/plain", status=500)


def ajax_snapshot_history(request, mapid):
    map_obj = _resolve_map(request, mapid, 'base.view_resourcebase', _PERMISSION_MSG_VIEW)
    history = [snapshot.json() for snapshot in map_obj.snapshots]
    return HttpResponse(json.dumps(history), content_type="text/plain")


def ajax_url_lookup(request):
    if request.method != 'POST':
        return HttpResponse(
            content='ajax user lookup requires HTTP POST',
            status=405,
            content_type='text/plain'
        )
    elif 'query' not in request.POST:
        return HttpResponse(
            content='use a field named "query" to specify a prefix to filter urls',
            content_type='text/plain')
    if request.POST['query'] != '':
        maps = Map.objects.filter(urlsuffix__startswith=request.POST['query'])
        if request.POST['mapid'] != '':
            maps = maps.exclude(id=request.POST['mapid'])
        json_dict = {
            'urls': [({'url': m.urlsuffix}) for m in maps],
            'count': maps.count(),
        }
    else:
        json_dict = {
            'urls': [],
            'count': 0,
        }
    return HttpResponse(
        content=json.dumps(json_dict),
        content_type='text/plain'
    )


def map_thumbnail(request, mapid):
    if request.method == 'POST':
        map_obj = _resolve_map(request, mapid)
        try:
            image = _render_thumbnail(request.body)

            if not image:
                return
            filename = "map-%s-thumb.png" % map_obj.uuid
            map_obj.save_thumbnail(filename, image)

            return HttpResponse('Thumbnail saved')
        except:
            return HttpResponse(
                content='error saving thumbnail',
                status=500,
                content_type='text/plain'
            )


def map_metadata_detail(request, mapid, template='maps/map_metadata_detail.html'):
    map_obj = _resolve_map(request, mapid, 'view_resourcebase')
    return render_to_response(template, RequestContext(request, {
        "resource": map_obj,
        'SITEURL': settings.SITEURL[:-1]
    }))



#@jahangir091
@csrf_exempt
@login_required
def map_publish(request, map_pk):
    if request.method == 'POST':
        try:
            map = Map.objects.get(id=map_pk)
        except Map.DoesNotExist:
            return Http404("Map does not exist")
        else:
            if request.user != map.owner:
                return HttpResponse(
                        loader.render_to_string(
                            '401.html', RequestContext(
                            request, {
                            'error_message': _("You are not allowed to publish this map.")})), status=401)
                # return HttpResponse('you are not allowed to publish this map')
            group = map.group
            map.status = 'PENDING'
            map.current_iteration += 1
            map.save()

            # notify organization admins about the new published map
            managers = list( group.get_managers())
            notify.send(request.user, recipient_list = managers, actor=request.user,
                        verb='pushed a new map for approval', target=map)

            map_submission_activity = MapSubmissionActivity(map=map, group=group, iteration=map.current_iteration)
            map_submission_activity.save()

            # set all the permissions for all the managers of the group for this map
            map.set_managers_permissions()

            messages.info(request, 'Pushed map successfully')
            return HttpResponseRedirect(reverse('member-workspace-map'))
    else:
        return HttpResponseRedirect(reverse('member-workspace-map'))

@login_required
def map_draft(request, map_pk):
    if request.method == 'POST':
        try:
            map = Map.objects.get(id=map_pk)
        except Map.DoesNotExist:
            return Http404("Map does not exist")

        group = map.group
        managers = list( group.get_managers())
        map.status = 'DRAFT'

        if request.user in managers or request.user.is_superuser:
            # only managers or superuser can change status
            map.save()
            messages.info(request, 'Unapproved map successfully')
            
        return HttpResponseRedirect(reverse('member-workspace-map'))            
    else:
        return HttpResponseRedirect(reverse('member-workspace-map'))

@csrf_exempt
@login_required
def map_approve(request, map_pk):
    if request.method == 'POST':
        form = ResourceApproveForm(request.POST)
        print form
        if form.is_valid():
            try:
                map = Map.objects.get(id=map_pk)
            except Map.DoesNotExist:
                return Http404("requested map does not exists")
            else:
                group = map.group
                if request.user not in group.get_managers():
                    if request.user != map.owner:
                        return HttpResponse(
                        loader.render_to_string(
                            '401.html', RequestContext(
                            request, {
                            'error_message': _("You are not allowed to approve this map.")})), status=401)
                    # return HttpResponse("you are not allowed to approve this map")
                map_submission_activity = MapSubmissionActivity.objects.get(map=map, group=group, iteration=map.current_iteration)
                map_audit_activity = MapAuditActivity(map_submission_activity=map_submission_activity)
                comment_body = request.POST.get('comment')
                comment_subject = request.POST.get('comment_subject')
                map.status = 'ACTIVE'
                map.last_auditor = request.user
                map.save()

                permissions = _perms_info_json(map)
                perm_dict = json.loads(permissions)
                if request.POST.get('view_permission'):
                    if not 'AnonymousUser' in perm_dict['users']:
                        perm_dict['users']['AnonymousUser'] = []
                        perm_dict['users']['AnonymousUser'].append('view_resourcebase')
                    else:
                        if not 'view_resourcebase' in perm_dict['users']['AnonymousUser']:
                            perm_dict['users']['AnonymousUser'].append('view_resourcebase')

                if request.POST.get('download_permission'):
                    if not 'AnonymousUser' in perm_dict['users']:
                        perm_dict['users']['AnonymousUser'] = []
                        perm_dict['users']['AnonymousUser'].append('download_resourcebase')
                    else:
                        if not 'download_resourcebase' in perm_dict['users']['AnonymousUser']:
                            perm_dict['users']['AnonymousUser'].append('download_resourcebase')

                map.set_permissions(perm_dict)



                # notify map owner that someone have approved the map
                if request.user != map.owner:
                    recipient = map.owner
                    notify.send(request.user, recipient=recipient, actor=request.user,
                    target=map, verb='approved your map')

                map_submission_activity.is_audited = True
                map_submission_activity.save()

                map_audit_activity.comment_subject = comment_subject
                map_audit_activity.comment_body = comment_body
                map_audit_activity.result = 'APPROVED'
                map_audit_activity.auditor = request.user
                map_audit_activity.save()

            messages.info(request, 'Approved map succesfully')
            return HttpResponseRedirect(reverse('admin-workspace-map'))
        else:
            messages.info(request, 'Please write an approve comment and try again')
            return HttpResponseRedirect(reverse('admin-workspace-map'))
    else:
        return HttpResponseRedirect(reverse('admin-workspace-map'))

@csrf_exempt
@login_required
def map_deny(request, map_pk):
    if request.method == 'POST':
        form = ResourceDenyForm(request.POST)
        if form.is_valid():
            try:
                map = Map.objects.get(id=map_pk)
            except:
                return Http404("requested map does not exists")
            else:
                group = map.group
                if request.user not in group.get_managers():
                    return HttpResponse(
                        loader.render_to_string(
                            '401.html', RequestContext(
                            request, {
                            'error_message': _("You are not allowed to deny this map.")})), status=401)
                    # return HttpResponse("you are not allowed to deny this map")
                map_submission_activity = MapSubmissionActivity.objects.get(map=map, group=group, iteration=map.current_iteration)
                map_audit_activity= MapAuditActivity(map_submission_activity=map_submission_activity)
                comment_body = request.POST.get('comment')
                comment_subject = request.POST.get('comment_subject')
                map.status = 'DENIED'
                map.last_auditor = request.user
                map.save()

                # notify map owner that someone have denied the map
                if request.user != map.owner:
                    recipient = map.owner
                    notify.send(request.user, recipient=recipient, actor=request.user,
                    target=map, verb='denied your map')

                map_submission_activity.is_audited = True
                map_submission_activity.save()

                map_audit_activity.comment_subject = comment_subject
                map_audit_activity.comment_body = comment_body
                map_audit_activity.result = 'DECLINED'
                map_audit_activity.auditor = request.user
                map_audit_activity.save()

            messages.info(request, 'Denied map successfully')
            return HttpResponseRedirect(reverse('admin-workspace-map'))
        else:
            messages.info(request, 'Please write an deny comment and try again')
            return HttpResponseRedirect(reverse('admin-workspace-map'))
    else:
        return HttpResponseRedirect(reverse('admin-workspace-map'))


@login_required
def map_delete(request, map_pk):
    if request.method == 'POST':
        try:
            map = Map.objects.get(id=map_pk)
        except:
            return Http404("requested map does not exists")
        else:
            if map.status == 'DRAFT' and ( request.user == map.owner or request.user in map.group.get_managers()):
                map.status = "DELETED"
                map.save()
            else:
                return HttpResponse(
                        loader.render_to_string(
                            '401.html', RequestContext(
                            request, {
                            'error_message': _("You have no acces to delete the map.")})), status=401)
                # messages.info(request, 'You have no acces to delete the map')

        messages.info(request, 'Deleted map successfully')
        if request.user == map.owner:
            return HttpResponseRedirect(reverse('member-workspace-map'))
        else:
            return HttpResponseRedirect(reverse('admin-workspace-map'))

    else:
        return HttpResponseRedirect(reverse('member-workspace-map'))


class WmsServerList(ListView):

    template_name = 'wms_server/wms_server_list.html'
    model = WmsServer

    def get_queryset(self):
        return WmsServer.objects.all()


class WmsServerCreate(CreateView):

    template_name = 'wms_server/wms_server_create.html'
    model = WmsServer
    form_class = WmsServerForm

    def get_success_url(self):
        return reverse('wms-server-list')


class WmsServerUpdate(UpdateView):
    template_name = 'wms_server/wms_server_create.html'
    model = WmsServer
    form_class = WmsServerForm

    def get_object(self):
        return WmsServer.objects.get(pk=self.kwargs['server_pk'])

    def get_success_url(self):
        return reverse('wms-server-list')


class WmsServerDelete(DeleteView):
    template_name = 'wms_server/wms_server_delete.html'
    model = WmsServer

    def get_success_url(self):
        return reverse('wms-server-list')

    def get_object(self):
        return WmsServer.objects.get(pk=self.kwargs['server_pk'])


def filter_map(request, config):
    layers = request.GET['layers']
    layers = json.loads(layers)['layers']
    if layers:
        for layer in layers:
            if layer['name'] == config['map']['layers'][layer['index']]['name']:
                config['map']['layers'][layer['index']]['cql_filter'] = layer['cql_filter']
                bbox = layer['bbox']
                # lat = bbox[0]
                # lon = bbox[3]
                # inProj = Proj(init='epsg:4326')
                # outProj = Proj(init='epsg:3857')
                #
                # center_lon, center_lat = transform(inProj, outProj, lon, lat)
                zoom, center_x, center_y = set_bounds_from_bbox(bbox)
                config['map']['center'] = [center_x, center_y]
                config['map']['zoom']= zoom


    return config



def set_bounds_from_bbox(bbox):
        """
        Calculate zoom level and center coordinates in mercator.
        """
        minx, miny, maxx, maxy = [float(c) for c in bbox]
        x = (minx + maxx) / 2
        y = (miny + maxy) / 2
        (center_x, center_y) = forward_mercator((y, x))

        xdiff = maxx - minx
        ydiff = maxy - miny

        zoom = 0

        if xdiff > 0 and ydiff > 0:
            width_zoom = math.log(360 / xdiff, 2)
            height_zoom = math.log(360 / ydiff, 2)
            zoom = math.ceil(min(width_zoom, height_zoom))

        zoom = zoom
        center_x = center_x
        center_y = center_y
        return zoom, center_x, center_y

class MapLayerRetrieveUpdateAPIView(RetrieveUpdateAPIView):
    serializer_class = MapLayerSerializer
    permission_classes = (permissions.IsAuthenticatedOrReadOnly,)

    def get(self, request, map_id, layername, **kwargs):
        map_obj = MapLayer.objects.filter(map_id=map_id, name=layername).first()
        serializer = MapLayerSerializer(map_obj)
        return Response(serializer.data)

    def put(self, request, map_id, layername, **kwargs):
        map_obj = MapLayer.objects.filter(map_id=map_id, name=layername).first()
        data = JSONParser().parse(request)
       
        if map_obj:
            map_obj.styles = data.get('styles', str())
            map_obj.save()
            return Response(dict(success =True))
        return Response(dict(success =False))
#end
