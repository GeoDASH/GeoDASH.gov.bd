
from itertools import groupby          
from operator import itemgetter

class AnalyticsMixin(object):
    """
    Analytics model mixin: format data, group data
    """
    def filter_response(self, model, key, results):
        model_dict = dict()
        for r in results:
            if 'object_id' in r:
                r[key+'_id'] = r.pop('object_id')
            try:
                if r[key+'_id'] in model_dict:
                    obj = model_dict[r[key+'_id']]
                else:
                    obj = model.objects.get(id=r[key+'_id'])
                    model_dict[r[key+'_id']] = obj
            except Exception:
                results.remove(r)
            else:
                r.update({'name': obj.title, 
                        key + '_organization': obj.owner.organization,
                        key + '_category':obj.category.identifier if obj.category else None, 
                        key + '_organization': obj.group.title})
        return results

    def get_analytics(self, data, keys):
        grouper = itemgetter(*tuple(keys))
        results = []
        for key, group in groupby(data, grouper):
            results.append(dict(dict(zip(keys, key)), count=len(list(group))))

        return results

    def format_data(self, query=None, model_instance=None, filters=None, exclude=None, order_by=None, extra_field=None):
        if model_instance:
            query = model_instance.objects.all()

        if filters:
            query = query.filter(**filters)
        if exclude:
            query = query.exclude(**exclude)
        if order_by:
            query = query.order_by(*tuple(order_by))

        extra = {}
        if extra_field:
            extra = dict(extra_field)

        data = [dict(l.__dict__, last_modified_date=l.last_modified_date, **extra) for l in query]

        return data