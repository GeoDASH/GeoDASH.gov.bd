import tempfile
import os


from django.shortcuts import render
from django.contrib.auth.decorators import login_required, user_passes_test
from django.shortcuts import render_to_response
from django.template import RequestContext
from django.shortcuts import get_object_or_404
from django.http import HttpResponse, HttpResponseRedirect
from django.core.urlresolvers import reverse
from django.contrib import messages
from django.http import Http404
from django.views.generic.list import ListView
from django.views.generic.detail import DetailView
from django.views.generic.edit import CreateView, UpdateView, DeleteView
from django.contrib.contenttypes.models import ContentType

from actstream.models import Action

from geonode.base.libraries.decorators import superuser_check
from models import SectionManagementTable
from models import SliderImages
from forms import SliderImageUpdateForm
from geonode.news.models import News
from geonode.layers.models import Layer
from models import SectionManagementModel
from forms import SliderSectionManagementForm, FeatureHighlightsSectionManagementForm, InterPortabilitySectionManagementForm, \
    PrettyMapsSectionManagementForm, Maps3DSectionManagementForm, ShareMapSectionManagementForm, OurPartnersSectionManagementForm
from models import IndexPageImagesModel
from forms import IndexPageImageUploadForm



# Create your views here.

class IndexClass(ListView):
    """
    Renders Index.html and Returns recent public activity.
    """
    context_object_name = 'action_list'
    queryset = Action.objects.filter(public=True)[:15]
    template_name = 'index.html'

    def get_context_data(self, *args, **kwargs):
        context = super(ListView, self).get_context_data(*args, **kwargs)

        # add sections to index page when start the application
        add_sections_to_index_page()

        contenttypes = ContentType.objects.all()
        for ct in contenttypes:
            if ct.name == 'layer':
                ct_layer_id = ct.id
            if ct.name == 'map':
                ct_map_id = ct.id
            if ct.name == 'comment':
                ct_comment_id = ct.id

        context['action_list_layers'] = Action.objects.filter(
            public=True,
            action_object_content_type__id=ct_layer_id)[:15]
        context['action_list_maps'] = Action.objects.filter(
            public=True,
            action_object_content_type__id=ct_map_id)[:15]
        context['action_list_comments'] = Action.objects.filter(
            public=True,
            action_object_content_type__id=ct_comment_id)[:15]
        context['latest_news_list'] = News.objects.all().order_by('-date_created')[:5]
        context['featured_layer_list'] = Layer.objects.filter(featured=True)
        sections = SectionManagementTable.objects.all()
        for section in sections:
            if section.slug == 'slider-section':
                context['is_slider'] = section.is_visible
            if section.slug == 'featured_layers':
                context['is_featured_layers'] = section.is_visible
            if section.slug == 'latest_news_and_updates':
                context['is_latest_news'] = section.is_visible
            if section.slug == 'feature_highlights_of_geodash':
                context['is_feature_highlights'] = section.is_visible
            if section.slug == 'interportability':
                context['is_interportability'] = section.is_visible
            if section.slug == 'make_pretty_maps_with_geodash':
                context['is_pretty'] = section.is_visible
            if section.slug == 'view_your_maps_in_3d':
                context['is_3dmap'] = section.is_visible
            if section.slug == 'share_your_map':
                context['is_share_map'] = section.is_visible
            if section.slug == 'how_it_works':
                context['is_how_it_works'] = section.is_visible
            if section.slug == 'what_geodash_offer?':
                context['is_what_geodash_offer'] = section.is_visible

            # context for section updates
            context['sliders'] = SliderImages.objects.filter(is_visible=True)
        return context

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
        'slider-section',
        'how-it-works-section',
        'featured-layers-section',
        'latest-news-and-updates-section',
        'feature-highlights-of-geodash-section',
        'interportability-section',
        'make-pretty-maps-with-geodash-section',
        'view-your-maps-in-3d-section',
        'share-your-map-section',
        'what-geodash-offer-section',
        'our-partners-section'
    ]
    if len(list_of_sections) != len(SectionManagementTable.objects.all()):
        SectionManagementTable.objects.all().delete()
        SectionManagementModel.objects.all().delete()
        for section in list_of_sections:
            new_section = SectionManagementTable(slug=section)
            if section in ['slider-section', 'feature-highlights-of-geodash-section', 'interportability-section',
                           'make-pretty-maps-with-geodash-section', 'view-your-maps-in-3d-section',
                           'share-your-map-section', 'our-partners-section']:
                new_section.should_update = True
            new_section.save()
            new_section = SectionManagementModel(slug=section)
            new_section.save()


class SliderImageList(ListView):
    """
    This view lists all the slider images
    """
    template_name = 'slider_image_list.html'
    model = SliderImages

    def get_queryset(self):
        return SliderImages.objects.all().order_by('-date_created')[:15]


class SliderImageCreate(CreateView):
    """
    This view is for creating new news
    """
    template_name = 'slider_image_crate.html'
    model = SliderImages
    form_class = SliderImageUpdateForm

    def get_success_url(self):
        return reverse('slider-image-list')


class SliderImageUpdate(UpdateView):
    """
    This view is for updating an existing news
    """
    template_name = 'slider_image_crate.html'
    model = SliderImages
    form_class = SliderImageUpdateForm

    def get_object(self):
        return SliderImages.objects.get(pk=self.kwargs['image_pk'])

    def get_success_url(self):
        return reverse('slider-image-list', kwargs={'image_pk': self.object.id})


class SliderImageDelete(DeleteView):
    """
    This view is for deleting an existing news
    """
    template_name = 'slider_image_delete.html'
    model = SliderImages

    def get_success_url(self):
        return reverse('slider-image-list')

    def get_object(self):
        return SliderImages.objects.get(pk=self.kwargs['image_pk'])


class SectionList(ListView):
    """
    This view lists all the slider images
    """
    template_name = 'slider_image_list.html'
    model = SectionManagementModel

    def get_queryset(self):
        return SectionManagementModel.objects.all().order_by('-date_created')[:15]


class SectionUpdate(UpdateView):
    """
    This view is for updating an existing news
    """
    template_name = 'section_update.html'
    model = SectionManagementModel

    def get_form_class(self):
        slug = SectionManagementTable.objects.get(pk=self.kwargs['section_pk']).slug
        if slug == 'slider-section':
            return SliderSectionManagementForm
        elif slug == 'feature-highlights-of-geodash-section':
            return FeatureHighlightsSectionManagementForm
        elif slug == 'interportability-section':
            return InterPortabilitySectionManagementForm
        elif slug == 'make-pretty-maps-with-geodash-section':
            return PrettyMapsSectionManagementForm
        elif slug == 'view-your-maps-in-3d-section':
            return Maps3DSectionManagementForm
        elif slug == 'share-your-map-section':
            return ShareMapSectionManagementForm
        elif slug == 'our-partners-section':
            return OurPartnersSectionManagementForm


    def get_object(self):
        slug = SectionManagementTable.objects.get(pk=self.kwargs['section_pk']).slug
        return SectionManagementModel.objects.get(slug=slug)

    def get_success_url(self):
        return reverse('section-list-table')

    def get_context_data(self, **kwargs):
        context = super(SectionUpdate, self).get_context_data(**kwargs)
        slug = SectionManagementTable.objects.get(pk=self.kwargs['section_pk']).slug
        if slug == 'slider-section':
            context['images'] = IndexPageImagesModel.objects.filter(is_active=True)
        elif slug == 'feature-highlights-of-geodash-section':
            context['images'] = IndexPageImagesModel.objects.filter(is_active=True)
        elif slug == 'interportability-section':
            context['images'] = IndexPageImagesModel.objects.filter(is_active=True)
        elif slug == 'make-pretty-maps-with-geodash-section':
            context['images'] = IndexPageImagesModel.objects.filter(is_active=True)
        elif slug == 'view-your-maps-in-3d-section':
            context['images'] = IndexPageImagesModel.objects.filter(is_active=True)
        elif slug == 'share-your-map-section':
            context['images'] = IndexPageImagesModel.objects.filter(is_active=True)
        elif slug == 'our-partners-section':
            context['images'] = IndexPageImagesModel.objects.filter(is_active=True)

        return context


class IndexPageImageCreateView(CreateView):
    """
    This view is for creating new news
    """
    template_name = 'slider_image_crate.html'
    model = IndexPageImagesModel
    form_class = IndexPageImageUploadForm

    def get_object(self, queryset=None):
        slug = SectionManagementTable.objects.get(pk=self.kwargs['section_pk']).slug
        self.slug = slug
        return object

    def post(self, request, *args, **kwargs):
        slug = SectionManagementTable.objects.get(pk=self.kwargs['section_pk']).slug
        self.slug = slug
        return super(IndexPageImageCreateView, self).post(request, *args, **kwargs)

    def get_success_url(self):
        return reverse('section-update-view', kwargs={'section_pk': self.kwargs['section_pk']})


class IndexPageImageListView(ListView):
    """
    This view lists all the slider images
    """
    template_name = 'slider_image_list.html'
    model = IndexPageImagesModel

    def get_queryset(self):
        return IndexPageImagesModel.objects.all().order_by('-date_created')[:15]


class IndexPageImageDelete(DeleteView):
    """
    This view is for deleting an image
    """
    model = IndexPageImagesModel

    def get_success_url(self):
        return reverse('section-update-view', kwargs={'section_pk': self.kwargs['section_pk']})

    def get_object(self):
        return IndexPageImagesModel.objects.get(pk=self.kwargs['image_pk'])
