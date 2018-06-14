from rest_framework.generics import UpdateAPIView
from rest_framework.response import Response
from rest_framework import status
from geonode.maps.models import Map, MapLayer, MapSnapshot, MapSubmissionActivity, MapAuditActivity
from notify.signals import notify


def approve_map(map_pk, user):
    try:
        map = Map.objects.get(id=map_pk)
    except Map.DoesNotExist:
        return False, status.HTTP_404_NOT_FOUND

    group = map.group
    if user not in group.get_managers() and not user.is_superuser:
        return False, status.HTTP_403_FORBIDDEN

    map_submission_activity = MapSubmissionActivity.objects.get(map=map, group=group, iteration=map.current_iteration)
    map_audit_activity = MapAuditActivity(map_submission_activity=map_submission_activity)
    
    map.status = 'ACTIVE'
    map.last_auditor = user
    map.save()

    # notify map owner that someone have approved the map
    if user != map.owner:
        recipient = map.owner
        notify.send(user, recipient=recipient, actor=user, target=map, verb='approved your map')

    map_submission_activity.is_audited = True
    map_submission_activity.save()

    map_audit_activity.result = 'APPROVED'
    map_audit_activity.auditor = user
    map_audit_activity.save()
    return True, status.HTTP_200_OK


class MultipleMapApproveAPIView(UpdateAPIView):
    
    def post(self, request):
        map_ids = request.data.get('map_ids')
        res = {}
        for map_id in map_ids:
            ret, ret_status = approve_map(map_id, request.user)
            res[map_id] = {
                'is_approved': ret,
                'status': ret_status
            }
        
        return Response(data=res, content_type='application/json', status=status.HTTP_200_OK)
        