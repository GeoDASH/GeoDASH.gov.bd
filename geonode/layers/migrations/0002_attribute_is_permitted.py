# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('layers', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='attribute',
            name='is_permitted',
            field=models.BooleanField(default=False, help_text='if true, permitted groups will see this attribute', verbose_name='is permitted'),
        ),
    ]
