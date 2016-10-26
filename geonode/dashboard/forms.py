from django import forms
from django.core.exceptions import ValidationError
from django.core.files.images import get_image_dimensions


from geonode.dashboard.models import SliderImages


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