from rest_framework.generics import RetrieveAPIView
from geonode.layers.models import StyleExtension
from rest_framework.permissions import IsAuthenticated
from geonode.utils import resolve_object
from geonode.layers.models import Layer, StyleExtension, Style
from django.core.exceptions import PermissionDenied
from rest_framework.response import Response


_PERMISSION_MSG_CHANGE_STYLE = ("You are not permitted to modify this style")


class StylePermissionRetrieveAPIView(RetrieveAPIView):
    """
    This call is responsible to check whether a layer style has permission or not
    """
    permission_classes = (IsAuthenticated, )
    def get(self,request, layername, pk, *args, **kwargs):
        flag = True
        style = None
        try:
            layer = Layer.objects.get(typename=layername)
            style = layer.styles.get(styleextension__id=pk)
            layer = resolve_object(request, 
                        Layer, 
                        dict(typename=layername),
                        'layers.change_layer_style',
                        _PERMISSION_MSG_CHANGE_STYLE)
        except PermissionDenied as ex:
            flag=False
        except Style.DoesNotExist as ex:
            flag=False
        finally:
            if style and (request.user == style.styleextension.created_by or request.user.is_superuser):
                flag = True
                
        return Response(dict(has_permission=flag))

