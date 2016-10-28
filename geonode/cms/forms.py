from django import forms
from django.core.exceptions import ValidationError
from django.core.files.images import get_image_dimensions

from suit.widgets import HTML5Input


from models import SliderImages, SectionManagementModel, IndexPageImagesModel


class SliderImageUpdateForm(forms.ModelForm):

    class Meta:
        model = SliderImages
        fields = ['title', 'descripton', 'image', 'is_active']

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
        fields = ['title', 'descripton', 'image']


class SliderSectionManagementForm(forms.ModelForm):

    class Meta:
        model = SectionManagementModel
        fields = ['title']
    #     widgets = {
    #         'background_color': HTML5Input(input_type='color'),
    #     }
    # def __init__(self, *args, **kwargs):
    #     super(SliderSectionManagementForm, self).__init__(*args, **kwargs)
    #     self.fields['background_color'].widget.attrs['style'] = 'width:70px; height:40px;'



class FeatureHighlightsSectionManagementForm(forms.ModelForm):

    class Meta:
        model = SectionManagementModel
        fields = ['title', 'section_sub_title', 'description', 'background_color']
        widgets = {
            'background_color': HTML5Input(input_type='color'),
        }
    def __init__(self, *args, **kwargs):
        super(FeatureHighlightsSectionManagementForm, self).__init__(*args, **kwargs)
        self.fields['background_color'].widget.attrs['style'] = 'width:70px; height:40px;'


class InterPortabilitySectionManagementForm(forms.ModelForm):

    class Meta:
        model = SectionManagementModel
        fields = ['title', 'description', 'background_color']
        widgets = {
            'background_color': HTML5Input(input_type='color', attrs={'size': 10}),
        }
    def __init__(self, *args, **kwargs):
        super(InterPortabilitySectionManagementForm, self).__init__(*args, **kwargs)
        self.fields['background_color'].widget.attrs['style'] = 'width:70px; height:40px;'



class PrettyMapsSectionManagementForm(forms.ModelForm):

    class Meta:
        model = SectionManagementModel
        fields = ['title', 'description', 'background_color']
        widgets = {
            'background_color': HTML5Input(input_type='color'),
        }
    def __init__(self, *args, **kwargs):
        super(PrettyMapsSectionManagementForm, self).__init__(*args, **kwargs)
        self.fields['background_color'].widget.attrs['style'] = 'width:70px; height:40px;'


class Maps3DSectionManagementForm(forms.ModelForm):

    class Meta:
        model = SectionManagementModel
        fields = ['title', 'description', 'background_color']
        widgets = {
            'background_color': HTML5Input(input_type='color'),
        }
    def __init__(self, *args, **kwargs):
        super(Maps3DSectionManagementForm, self).__init__(*args, **kwargs)
        self.fields['background_color'].widget.attrs['style'] = 'width:70px; height:40px;'


class ShareMapSectionManagementForm(forms.ModelForm):

    class Meta:
        model = SectionManagementModel
        fields = ['title', 'description', 'background_color']
        widgets = {
            'background_color': HTML5Input(input_type='color'),
        }
    def __init__(self, *args, **kwargs):
        super(ShareMapSectionManagementForm, self).__init__(*args, **kwargs)
        self.fields['background_color'].widget.attrs['style'] = 'width:70px; height:40px;'


class OurPartnersSectionManagementForm(forms.ModelForm):

    class Meta:
        model = SectionManagementModel
        fields = ['title', 'background_color']
        widgets = {
            'background_color': HTML5Input(input_type='color'),
        }
    def __init__(self, *args, **kwargs):
        super(OurPartnersSectionManagementForm, self).__init__(*args, **kwargs)
        self.fields['background_color'].widget.attrs['style'] = 'width:70px; height:40px;'
