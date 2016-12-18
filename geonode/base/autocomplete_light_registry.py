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

import autocomplete_light

from taggit.models import Tag
from models import ResourceBase, Region



class ResourceBaseAutocomplete(autocomplete_light.AutocompleteModelBase):
    search_fields=['title', 'group__title', 'owner__username', 'keywords__name']
    def choices_for_request(self):
        self.choices = self.choices.distinct()
        return super(ResourceBaseAutocomplete, self).choices_for_request()


autocomplete_light.register(Region,
                            search_fields=['name'],
                            autocomplete_js_attributes={'placeholder': 'Region/Country ..', },)

autocomplete_light.register(ResourceBase,
                            ResourceBaseAutocomplete
                            # search_fields=['title', 'group__title', 'owner__username', 'keywords__name'],
                            # autocomplete_js_attributes={'placeholder': 'Resource name..', },
                            )

autocomplete_light.register(Tag,
                            search_fields=['name', 'slug'],
                            autocomplete_js_attributes={'placeholder':
                                                        'A space or comma-separated list of keywords', },)

