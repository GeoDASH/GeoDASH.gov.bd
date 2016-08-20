from django.shortcuts import render
from django.contrib.auth.decorators import login_required, user_passes_test
from django.shortcuts import render_to_response
from django.template import RequestContext
from django.shortcuts import get_object_or_404
from django.http import HttpResponse, HttpResponseRedirect
from django.core.urlresolvers import reverse
from django.contrib import messages

from geonode.base.libraries.decorators import superuser_check
from geonode.dashboard.models import SectionManagementTable

# Create your views here.

@login_required
@user_passes_test(superuser_check)
def section_list(request, template='section_table.html'):
    """
    This view is for updating section sho/hide table from web. Only super admin can manage this table.
    """
    context_dict = {
        "section_list": SectionManagementTable.objects.all(),
    }
    return render_to_response(template, RequestContext(request, context_dict))


@login_required
@user_passes_test(superuser_check)
def section_update(request):
    """
    This view is for updating section table from web. Only super admin can manage this table.
    """

    if request.method == 'POST':
        raw_section_ids = request.POST.getlist('section_id')
        section_ids = []
        for id in raw_section_ids:
            section_ids.append(int(id))
        sections = SectionManagementTable.objects.all()
        for section in sections:
            if section.id in section_ids:
                section.is_visible = True
            else:
                section.is_visible = False
            section.save()
        messages.success(request, 'Sections changed successfully')
        return HttpResponseRedirect(reverse('section-list-table'))
    else:
        return HttpResponseRedirect(reverse('section-list-table'))


def add_sections_to_index_page():
    list_of_sections = [
        'slider',
        'how_it_works',
        'featured_layers',
        'latest_news_and_updates',
        'feature_highlights_of_geodash',
        'interportability',
        'make_pretty_maps_with_geodash',
        'view_your_maps_in_3d',
        'share_your_map',
        'what_geodash_offer?'
    ]
    if len(list_of_sections) != len(SectionManagementTable.objects.all()):
        SectionManagementTable.objects.all().delete()
        for section in list_of_sections:
            new_section = SectionManagementTable(section=section)
            new_section.save()
