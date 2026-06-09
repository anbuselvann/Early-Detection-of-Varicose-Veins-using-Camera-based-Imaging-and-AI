import json
import codecs

try:
    with codecs.open('scratch/models_list.json', 'r', 'utf-16le') as f:
        data = json.load(f)
        for model in data['models']:
            print(model['name'])
except Exception as e:
    print(f"Error: {e}")
