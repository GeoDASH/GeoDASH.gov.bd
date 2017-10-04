# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import migrations, models
import datetime


class Migration(migrations.Migration):

    dependencies = [
        ('people', '24_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='profile',
            name='last_notification_view',
            field=models.DateTimeField(default=datetime.datetime.now),
        ),
    ]
