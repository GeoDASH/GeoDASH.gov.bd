import requests

from actstream.models import Action
from django.views.generic import ListView
from django.contrib.auth.decorators import login_required, user_passes_test

from geonode.layers.models import Layer
from geonode.documents.models import Document
from geonode.maps.models import Map
from geonode.groups.models import GroupProfile
from geonode.layers.models import LayerSubmissionActivity, LayerAuditActivity
from geonode.people.models import Profile


class MemberWorkspaceLayer(ListView):

    """
    This view returns members resources for different stages.
    """

    model = Layer
    template_name = 'member/layer.html'

    def get_context_data(self, *args, **kwargs):
        context = super(ListView, self).get_context_data(*args, **kwargs)

        context['draft_list'] = Layer.objects.filter(owner=self.request.user, status='DRAFT').order_by('date_updated')
        context['pending_list'] = Layer.objects.filter(owner=self.request.user, status='PENDING').order_by('date_updated')[:15]
        context['denied_list'] = Layer.objects.filter(owner=self.request.user, status='DENIED').order_by('date_updated')
        context['active_list'] = Layer.objects.filter(owner=self.request.user, status='ACTIVE').order_by('date_updated')
        return context


class MemberWorkspaceDocument(ListView):
    """
    This view returns members resources for different stages.
    """

    model = Document
    template_name = 'member/document.html'


    def get_context_data(self, *args, **kwargs):
        context = super(ListView, self).get_context_data(*args, **kwargs)
        context['draft_list'] = Document.objects.filter(owner=self.request.user, status='DRAFT').order_by('date_updated')
        context['pending_list'] = Document.objects.filter(owner=self.request.user, status='PENDING').order_by('date_updated')[:15]
        context['denied_list'] = Document.objects.filter(owner=self.request.user, status='DENIED').order_by('date_updated')
        context['active_list'] = Document.objects.filter(owner=self.request.user, status='ACTIVE').order_by('date_updated')
        return context


class MemberWorkspaceMap(ListView):

    """
    This view returns members resources for different stages.
    """

    model = Map
    template_name = 'member/map.html'

    def get_context_data(self, *args, **kwargs):
        context = super(ListView, self).get_context_data(*args, **kwargs)
        context['draft_list'] = Map.objects.filter(owner=self.request.user, status='DRAFT').order_by('date_updated')
        context['pending_list'] = Map.objects.filter(owner=self.request.user, status='PENDING').order_by('date_updated')[:15]
        context['denied_list'] = Map.objects.filter(owner=self.request.user, status='DENIED').order_by('date_updated')
        context['active_list'] = Map.objects.filter(owner=self.request.user, status='ACTIVE').order_by('date_updated')
        return context


class AdminWorkspaceLayer(ListView):
    """
    This view returns members resources for different stages.
    """

    model = Layer
    template_name = 'admin/layer.html'

    def get_context_data(self, *args, **kwargs):
        context = super(ListView, self).get_context_data(*args, **kwargs)
        groups = GroupProfile.objects.filter(groupmember__user=self.request.user, groupmember__role='manager')
        context['user_approval_request_list'] = Layer.objects.filter(status='PENDING', group__in=groups).order_by('date_updated')
        context['approved_list'] = Layer.objects.filter(status='ACTIVE', group__in=groups).order_by('date_updated')[:15]
        context['user_draft_list'] = Layer.objects.filter(status='DRAFT', group__in=groups).order_by('date_updated')
        context['denied_list'] = Layer.objects.filter(status='DENIED', group__in=groups).order_by('date_updated')[:15]
        return context


class AdminWorkspaceDocument(ListView):
    """
    This view returns members resources for different stages.
    """

    model = Document
    template_name = 'admin/document.html'


    def get_context_data(self, *args, **kwargs):
        context = super(ListView, self).get_context_data(*args, **kwargs)
        groups = GroupProfile.objects.filter(groupmember__user=self.request.user, groupmember__role='manager')
        context['user_approval_request_list'] = Document.objects.filter(status='PENDING', group__in=groups).order_by('date_updated')
        context['approved_list'] = Document.objects.filter(status='ACTIVE', group__in=groups).order_by('date_updated')[:15]
        context['user_draft_list'] = Document.objects.filter(status='DRAFT', group__in=groups).order_by('date_updated')
        context['denied_list'] = Document.objects.filter(status='DENIED', group__in=groups).order_by('date_updated')[:15]
        return context


class AdminWorkspaceMap(ListView):

    """
    This view returns members resources for different stages.
    """

    model = Map
    template_name = 'admin/map.html'

    def get_context_data(self, *args, **kwargs):
        context = super(ListView, self).get_context_data(*args, **kwargs)
        groups = GroupProfile.objects.filter(groupmember__user=self.request.user, groupmember__role='manager')
        context['user_approval_request_list'] = Map.objects.filter(status='PENDING', group__in=groups).order_by('date_updated')
        context['approved_list'] = Map.objects.filter(status='ACTIVE', group__in=groups).order_by('date_updated')[:15]
        context['user_draft_list'] = Map.objects.filter(status='DRAFT', group__in=groups).order_by('date_updated')
        context['denied_list'] = Map.objects.filter(status='DENIED', group__in=groups).order_by('date_updated')[:15]
        return context


class AdminWorkspaceUserList(ListView):
    """

    """

    model = Profile
    template_name = 'admin/userlist.html'

    def get_context_data(self, *args, **kwargs):
        context = super(ListView, self).get_context_data(*args, **kwargs)
        groups = GroupProfile.objects.filter(groupmember__user=self.request.user, groupmember__role='manager')
        group_member_list = {}
        for group in groups:
            url = "http://localhost:8000/api/profiles/?group=" + group.slug
            users = requests.get(url).json()
            group_member_list[group.title] = users['objects']
        context['user_list'] = group_member_list

        return context
