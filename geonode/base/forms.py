# -*- coding: utf-8 -*-
#########################################################################
#
# Copyright (C) 2016 OSGeo
#
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
# GNU General Public License for more details.
#
# You should have received a copy of the GNU General Public License
# along with this program. If not, see <http://www.gnu.org/licenses/>.
#
#########################################################################

import os
import autocomplete_light
from autocomplete_light.contrib.taggit_field import TaggitField, TaggitWidget

from django import forms
from django.utils.safestring import mark_safe
from django.utils.translation import ugettext as _
from django.conf import settings

from mptt.forms import TreeNodeMultipleChoiceField
from bootstrap3_datetime.widgets import DateTimePicker
from modeltranslation.forms import TranslationModelForm
from taggit.models import Tag

from geonode.base.models import TopicCategory, Region
from geonode.people.models import Profile
from geonode.groups.models import GroupProfile


class CategoryChoiceField(forms.ModelChoiceField):
    def label_from_instance(self, obj):
        return '<span class="has-popover" data-container="body" data-toggle="popover" data-placement="top" ' \
               'data-content="' + obj.description + '" trigger="hover">' \
               '<div class="fa-stack fa-1g">' \
               '<i class="fa fa-square-o fa-stack-2x"></i>' \
               '<i class="fa '+obj.fa_class+' fa-stack-1x"></i></div>' \
               '&nbsp;' + obj.gn_description + '</span>'


class TreeWidget(forms.TextInput):
        input_type = 'text'

        def __init__(self, attrs=None):
            super(TreeWidget, self).__init__(attrs)

        def render(self, name, values, attrs=None):
            if isinstance(values, basestring):
                vals = values
            else:
                vals = ','.join([str(i.tag.name) for i in values])
            output = ["""<input class='form-control' id='id_resource-keywords' name='resource-keywords'
                 value='%s'><br/>""" % (vals)]
            output.append('<div id="treeview" class=""></div>')
            return mark_safe(u'\n'.join(output))


class CategoryForm(forms.Form):
    category_choice_field = CategoryChoiceField(required=False,
                                                label='*' + _('Category'),
                                                empty_label=None,
                                                queryset=TopicCategory.objects.filter(is_choice=True)
                                                .extra(order_by=['description']))

    def clean(self):
        cleaned_data = self.data
        ccf_data = cleaned_data.get("category_choice_field")

        if not ccf_data:
            msg = _("Category is required.")
            self._errors = self.error_class([msg])

        # Always return the full collection of cleaned data.
        return cleaned_data


class ResourceBaseForm(TranslationModelForm):
    """Base form for metadata, should be inherited by childres classes of ResourceBase"""

    owner = forms.ModelChoiceField(
        empty_label="Owner",
        label=_("Owner"),
        required=False,
        queryset=Profile.objects.exclude(
            username='AnonymousUser'),
        widget=autocomplete_light.ChoiceWidget('ProfileAutocomplete'))

    _date_widget_options = {
        "icon_attrs": {"class": "fa fa-calendar"},
        "attrs": {"class": "form-control input-sm"},
        "format": "%Y-%m-%d %I:%M %p",
        # Options for the datetimepickers are not set here on purpose.
        # They are set in the metadata_form_js.html template because
        # bootstrap-datetimepicker uses jquery for its initialization
        # and we need to ensure it is available before trying to
        # instantiate a new datetimepicker. This could probably be improved.
        "options": False,
        }
    date = forms.DateTimeField(
        label=_("Date"),
        localize=True,
        input_formats=['%Y-%m-%d %I:%M %p'],
        widget=DateTimePicker(**_date_widget_options)
    )
    temporal_extent_start = forms.DateTimeField(
        label=_("temporal extent start"),
        required=False,
        localize=True,
        input_formats=['%Y-%m-%d %I:%M %p'],
        widget=DateTimePicker(**_date_widget_options)
    )
    temporal_extent_end = forms.DateTimeField(
        label=_("temporal extent end"),
        required=False,
        localize=True,
        input_formats=['%Y-%m-%d %I:%M %p'],
        widget=DateTimePicker(**_date_widget_options)
    )

    poc = forms.ModelChoiceField(
        empty_label=_("Person outside GeoNode (fill form)"),
        label=_("Point of Contact"),
        required=False,
        queryset=Profile.objects.exclude(
            username='AnonymousUser'),
        widget=autocomplete_light.ChoiceWidget('ProfileAutocomplete'))

    metadata_author = forms.ModelChoiceField(
        empty_label=_("Person outside GeoNode (fill form)"),
        label=_("Metadata Author"),
        required=False,
        queryset=Profile.objects.exclude(
            username='AnonymousUser'),
        widget=autocomplete_light.ChoiceWidget('ProfileAutocomplete'))

    keywords = TaggitField(
        label=_("Keywords"),
        required=False,
        help_text=_("A space or comma-separated list of keywords"),
        widget=TaggitWidget('HierarchicalKeywordAutocomplete'))

    regions = TreeNodeMultipleChoiceField(
        label=_("Regions"),
        required=False,
        queryset=Region.objects.all(),
        level_indicator=u'___')
    regions.widget.attrs = {"size": 20}

    def __init__(self, *args, **kwargs):
        super(ResourceBaseForm, self).__init__(*args, **kwargs)
        for field in self.fields:
            help_text = self.fields[field].help_text
            self.fields[field].help_text = None
            if help_text != '':
                self.fields[field].widget.attrs.update(
                    {
                        'class': 'has-popover',
                        'data-content': help_text,
                        'data-placement': 'right',
                        'data-container': 'body',
                        'data-html': 'true'})

    class Meta:
        exclude = (
            'contacts',
            'name',
            'uuid',
            'bbox_x0',
            'bbox_x1',
            'bbox_y0',
            'bbox_y1',
            'srid',
            'category',
            'csw_typename',
            'csw_schema',
            'csw_mdsource',
            'csw_type',
            'csw_wkt_geometry',
            'metadata_uploaded',
            'metadata_xml',
            'csw_anytext',
            'popular_count',
            'share_count',
            'thumbnail',
            'charset',
            'rating',
            'detail_url',
            'group'
            )


#@jahangir091
def comment_subjects(comment_type):
    if comment_type == 'approve':
        subjects_file = open(os.path.join(settings.PROJECT_ROOT, 'approve_comment_subjects.txt'), "r")
    elif comment_type == 'deny':
        subjects_file = open(os.path.join(settings.PROJECT_ROOT, 'deny_comment_subjects.txt'), "r")

    approve_comment_subjects = [line.rstrip('\n') for line in subjects_file]
    iter_list = []
    for subject in approve_comment_subjects:
        subject_tuple = (subject, subject)
        iter_list.append(subject_tuple)
    return iter_list


class ResourceApproveForm(forms.Form):
    comment_subject = forms.ChoiceField( choices=comment_subjects('approve'))
    comment = forms.CharField(max_length=500,  widget=forms.Textarea, required=False)
    view_permission = forms.BooleanField(label="Anyone can view this resource", required=False)
    download_permission = forms.BooleanField(label="Anyone can download this resource", required=False)


class ResourceDenyForm(forms.Form):
    comment_subject = forms.ChoiceField(required=True, choices=comment_subjects('deny'))
    comment = forms.CharField(max_length=500, required=True, widget=forms.Textarea)


class TopicCategoryForm(forms.ModelForm):

    class Meta:
        model = TopicCategory
        fields = ['identifier', 'description', 'gn_description', 'is_choice']


class TagForm(forms.ModelForm):

    class Meta:
        model = Tag
        fields = ['name']

#end