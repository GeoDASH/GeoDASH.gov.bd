from django.db import models

# Create your models here.


from django.db.models.signals import class_prepared

def longer_name(sender, *args, **kwargs):
    # You can't just do `if sender == django.contrib.auth.models.User`
    # because you would have to import the model
    # You have to test using __name__ and __module__
    if sender.__name__ == "Group" and sender.__module__ == "django.contrib.auth.models":
        sender._meta.get_field("name").max_length = 550

class_prepared.connect(longer_name)