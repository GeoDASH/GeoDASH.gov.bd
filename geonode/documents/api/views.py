from rest_framework import status
from rest_framework.generics import UpdateAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from geonode.documents.api.utils import document_status_update

class MultipleDocumentsApproveAPIView(UpdateAPIView):
    """
    This api view will approve multiple documents
    """
    
    permission_classes = (IsAuthenticated,)

    def put(self, request):
        document_ids = request.data.get('document_ids')
        res = {}
        for document_id in document_ids:
            ret, ret_status = document_status_update(id=document_id, user=request.user, document_status='ACTIVE', document_audit_status='APPROVED')
            res[document_id] = {
                'is_approved': ret,
                'status': ret_status
            }
        return Response(data=res, content_type='application/json', status=status.HTTP_200_OK)
        