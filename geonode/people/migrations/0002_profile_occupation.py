# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('people', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='profile',
            name='occupation',
            field=models.CharField(default=b'', max_length=50, null=True, blank=True),
        ),
    ]
