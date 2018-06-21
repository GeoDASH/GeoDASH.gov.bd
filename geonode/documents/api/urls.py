# rest_framework api
import views

from django.conf.urls import url


urlpatterns =[
    url(r'^approve-multiple-documents/$', views.MultipleDocumentsApproveAPIView.as_view()),
]
