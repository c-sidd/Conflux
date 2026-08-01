from django.urls import path
from .views import TrashListView, RestoreItemView, PermanentDeleteItemView, EmptyTrashView

urlpatterns = [
    path('trash/', TrashListView.as_view(), name='trash-list'),
    path('trash/<int:pk>/restore/', RestoreItemView.as_view(), name='trash-restore'),
    path('trash/<int:pk>/permanent/', PermanentDeleteItemView.as_view(), name='trash-permanent'),
    path('trash/empty/', EmptyTrashView.as_view(), name='trash-empty'),
]
