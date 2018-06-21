from rest_framework import status
from geonode.maps.models import Map, MapSubmissionActivity, MapAuditActivity
from notify.signals import notify


def map_status_update(id, user, map_status, map_audit_status):
    try:
        map = Map.objects.get(id=id)
    except Map.DoesNotExist:
        return False, status.HTTP_404_NOT_FOUND

    group = map.group
    if user not in group.get_managers() and not user.is_superuser:
        return False, status.HTTP_403_FORBIDDEN

    map_submission_activity = MapSubmissionActivity.objects.get(map=map, group=group, iteration=map.current_iteration)
    map_audit_activity = MapAuditActivity(map_submission_activity=map_submission_activity)
    
    map.status = map_status
    map.last_auditor = user
    map.save()

    # notify map owner that someone have approved the map
    if user != map.owner:
        recipient = map.owner
        notify.send(user, recipient=recipient, actor=user, target=map, verb='{} your map'.format(map_audit_status.lower()))

    map_submission_activity.is_audited = True
    map_submission_activity.save()

    map_audit_activity.result = map_audit_status
    map_audit_activity.auditor = user
    map_audit_activity.save()
    return True, status.HTTP_200_OK