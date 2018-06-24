# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('groups', '0006_auto_20161119_1751'),
    ]

    operations = [
        migrations.AlterField(
            model_name='groupprofile',
            name='title',
            field=models.CharField(max_length=200, verbose_name='Title'),
        ),
    ]
