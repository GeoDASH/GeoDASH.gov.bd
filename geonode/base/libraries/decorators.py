from django.http import Http404


def superuser_check(user):
    if not user.is_superuser:
        raise Http404
    return user.is_superuser

def manager_or_member(user):
    if user.is_manager_of_any_group:
        return user.is_manager_of_any_group
    elif user.is_member_of_any_group:
        return user.is_member_of_any_group
    else:
        raise Http404
