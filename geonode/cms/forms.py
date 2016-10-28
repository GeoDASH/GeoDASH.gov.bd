from django import forms
from django.core.exceptions import ValidationError
from django.core.files.images import get_image_dimensions

from suit.widgets import HTML5Input


from models import SliderImages, SectionManagementModel, IndexPageImagesModel


class SliderImageUpdateForm(forms.ModelForm):

    class Meta:
        model = SliderImages
        fields = ['title', 'descripton', 'image', 'is_visible']

    def clean_image(self):
         image = self.cleaned_data.get('image',False)
         if image:
             w, h = get_image_dimensions(image)
             if w != 1920 or h != 600:
                   raise ValidationError("Please upload image with dimension(w * h = 220 * 600)")
             return image
         else:
             raise ValidationError("Couldn't read uploaded image")


class IndexPageImageUploadForm(forms.ModelForm):
    """

    """
    class Meta:
        model = IndexPageImagesModel
        fields = ['title', 'descripton', 'is_active', 'image']


class SliderSectionManagementForm(forms.ModelForm):

    class Meta:
        model = SectionManagementModel
        fields = ['background_image', 'background_color']
        widgets = {
            'background_color': HTML5Input(input_type='color'),
        }



class FeatureHighlightsSectionManagementForm(forms.ModelForm):

    class Meta:
        model = SectionManagementModel
        fields = ['title', 'section_sub_title', 'description', 'background_color']
        widgets = {
            'background_color': HTML5Input(input_type='color'),
        }


class InterPortabilitySectionManagementForm(forms.ModelForm):

    class Meta:
        model = SectionManagementModel
        fields = ['title', 'description', 'background_color']
        widgets = {
            'background_color': HTML5Input(input_type='color'),
        }


class PrettyMapsSectionManagementForm(forms.ModelForm):

    class Meta:
        model = SectionManagementModel
        fields = ['title', 'description', 'background_color']
        widgets = {
            'background_color': HTML5Input(input_type='color'),
        }


class Maps3DSectionManagementForm(forms.ModelForm):

    class Meta:
        model = SectionManagementModel
        fields = ['title', 'description', 'background_color']
        widgets = {
            'background_color': HTML5Input(input_type='color'),
        }


class ShareMapSectionManagementForm(forms.ModelForm):

    class Meta:
        model = SectionManagementModel
        fields = ['title', 'description', 'background_color']
        widgets = {
            'background_color': HTML5Input(input_type='color'),
        }


class OurPartnersSectionManagementForm(forms.ModelForm):

    class Meta:
        model = SectionManagementModel
        fields = ['title', 'background_color']
        widgets = {
            'background_color': HTML5Input(input_type='color'),
        }
