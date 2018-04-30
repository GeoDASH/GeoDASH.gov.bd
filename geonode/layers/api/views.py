
from django.http import HttpResponse
try:
    import json
except ImportError:
    from django.utils import simplejson as json

from django.contrib.gis.db import models
from django.db import transaction, IntegrityError, DatabaseError

from geonode.class_factory import ClassFactory
from geonode.layers.models import Layer
from rest_framework.generics import CreateAPIView
from rest_framework.permissions import IsAuthenticated

from geonode.rest_authentications import CsrfExemptSessionAuthentication
from rest_framework.response import Response
from rest_framework import status


class LayerFeatureUploadView(CreateAPIView):
    '''
    This API class receives a layer feature as json input
    and processes that feature to upload to postgis database
    directly to the specified layer.
    '''
    _EXTRA_FIELD = {'USER-DEFINED': models.GeometryField}
    permission_classes = (IsAuthenticated,)
    authentication_classes = (CsrfExemptSessionAuthentication,)

    def post(self, request, pk, **kwargs):
        out = dict(success=True)
        status_code = status.HTTP_201_CREATED
        factory = ClassFactory(self._EXTRA_FIELD)
        try:
            layer = Layer.objects.get(id=pk)
            model_instance = factory.get_model(name=str(layer.title_en), 
                                                table_name=str(layer.name),
                                                db=str(layer.store))
            with transaction.atomic(using=str(layer.store)):
                for feature in request.data:
                    obj = model_instance(**feature)
                    obj.save()

        except Layer.DoesNotExist:
            out['success'] = False
            out['errors'] = "Layer Does not exist with this id"
            status_code = status.HTTP_404_NOT_FOUND
        except Exception as ex:
            out['success'] = False
            out['error'] = ex.message
            status_code = status.HTTP_400_BAD_REQUEST

        return Response(data=out, content_type='application/json', status=status_code)
