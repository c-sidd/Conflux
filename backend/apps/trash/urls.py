from django.urls import path
from .views import TrashListView, EmptyTrashView

urlpatterns = [
    path('trash/', TrashListView.as_view(), name='trash-list'),
    path('trash/empty/', EmptyTrashView.as_view(), name='trash-empty'),
]
