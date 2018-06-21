from rest_framework import status
from geonode.documents.models import Document, DocumentSubmissionActivity, DocumentAuditActivity
from notify.signals import notify


def document_status_update(id, user, document_status, document_audit_status):
    try:
        document = Document.objects.get(id=id)
    except Document.DoesNotExist:
        return False, status.HTTP_404_NOT_FOUND
    
    group = document.group
    if user not in group.get_managers() and not user.is_superuser:
        return False, status.HTTP_403_FORBIDDEN

    document_submission_activity = DocumentSubmissionActivity.objects.get(document=document, group=group, iteration=document.current_iteration)
    document_audit_activity = DocumentAuditActivity(document_submission_activity=document_submission_activity)
   
    document.status = document_status #'ACTIVE'
    document.last_auditor = user
    document.save()

    # notify document owner that someone have deleted the document
    if user != document.owner:
        recipient = document.owner
        notify.send(user, recipient=recipient, actor=user,
                    target=document,  verb= '{} your document'.format(document_audit_status.lower()))

    document_submission_activity.is_audited = True
    document_submission_activity.save()

    document_audit_activity.result = document_audit_status #'APPROVED'
    document_audit_activity.auditor = user
    document_audit_activity.save()
    return True, status.HTTP_200_OK    
