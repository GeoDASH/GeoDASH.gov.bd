from rest_framework.generics import RetrieveAPIView
from geonode.layers.models import StyleExtension
from rest_framework.permissions import IsAuthenticated
from geonode.utils import resolve_object
from geonode.layers.models import Layer, StyleExtension
from django.core.exceptions import PermissionDenied
from rest_framework import response, status


_PERMISSION_MSG_CHANGE_STYLE = ("You are not permitted to modify this style")


class StylePermissionRetrieveAPIView(RetrieveAPIView):
    """
    This call is responsible to check whether a layer style has permission or not
    """
    permission_classes = (IsAuthenticated, )
    def get(self, request, layer_name, pk, *args, **kwargs):
        flag = True
        style = StyleExtension.objects.none()
        try:
            style = StyleExtension.objects.get(pk=pk);
            resolve_object(request, 
                        Layer, 
                        dict(typename=layer_name),
                        'layers.change_layer_style',
                        _PERMISSION_MSG_CHANGE_STYLE)
        except PermissionDenied as ex:
            flag=False
        except StyleExtension.DoesNotExist as ex:
            flag=False
        finally:
            if style and request.user == style.created_by:
                flag = True
        return response(flag)

