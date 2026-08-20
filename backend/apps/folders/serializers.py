from rest_framework import serializers
from .models import Folder

class FolderSerializer(serializers.ModelSerializer):
    class Meta:
        model = Folder
        fields = ['id', 'name', 'parent', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']

    def create(self, validated_data):
        # Automatically attach the user to the folder
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)

    def validate(self, attrs):
        user = self.context['request'].user
        parent = attrs.get('parent')
        instance = self.instance

        if instance and parent:
            if parent.id == instance.id:
                raise serializers.ValidationError("Cannot move folder inside itself.")
            
            # Prevent cycle (moving inside its own descendant)
            curr = parent
            while curr:
                if curr.id == instance.id:
                    raise serializers.ValidationError("Cannot move folder into its own descendant.")
                curr = curr.parent

        # Validate unique folder names within the same parent
        name = attrs.get('name', instance.name if instance else None)
        parent_obj = parent if 'parent' in attrs else (instance.parent if instance else None)
        qs = Folder.objects.filter(name=name, parent=parent_obj, user=user)
        if instance:
            qs = qs.exclude(id=instance.id)
        if qs.exists():
            raise serializers.ValidationError("A folder with this name already exists in the target folder.")

        return attrs
