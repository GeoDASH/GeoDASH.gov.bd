from rest_framework.generics import UpdateAPIView
from rest_framework.response import Response
from rest_framework import status
from geonode.maps.models import Map, MapLayer, MapSnapshot
from geonode.maps.api.utils import map_status_update


class MultipleMapsApproveAPIView(UpdateAPIView):
    
    def put(self, request):
        map_ids = request.data.get('map_ids')
        res = {}
        for map_id in map_ids:
            ret, ret_status = map_status_update(id=map_id, user=request.user, map_status='ACTIVE', map_audit_status='APPROVED')
            res[map_id] = {
                'is_approved': ret,
                'status': ret_status
            }
        
        return Response(data=res, content_type='application/json', status=status.HTTP_200_OK)
        