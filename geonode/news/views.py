from django.shortcuts import render
from django.views.generic.edit import CreateView
from django.core.urlresolvers import reverse_lazy
from django.http import HttpResponseRedirect
from django.core.urlresolvers import reverse
from django.shortcuts import render_to_response
from django.template import RequestContext
from django.contrib.auth.decorators import login_required, user_passes_test

from geonode.news.models import News
from geonode.news.forms import NewsUpdateForm
from geonode.base.libraries.decorators import superuser_check

# Create your views here.

@login_required
@user_passes_test(superuser_check)
def news_create(request):
    if request.method == 'POST':
        form = NewsUpdateForm(request.POST)
        if form.is_valid():
            form.save()
            return HttpResponseRedirect(reverse('news-list'))
    else:
        form = NewsUpdateForm()
    return render(request, "news_create.html", {'form': form, })


def news_lsit(request, template='news_list.html'):
    context_dict = {
        "news_list": News.objects.all()[:15],
    }
    return render_to_response(template, RequestContext(request, context_dict))


def news_details(request, news_pk, template='news_details.html'):
    context_dict = {
        "news": News.objects.get(id=news_pk)
    }
    return render_to_response(template, RequestContext(request, context_dict))