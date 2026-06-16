import os

from services.rag_service import add_log

UPLOAD_FOLDER = "uploads"

for filename in os.listdir(UPLOAD_FOLDER):

    filepath = os.path.join(UPLOAD_FOLDER, filename)

    with open(filepath, "r", encoding="utf-8") as f:

        content = f.read()

        add_log(content, filename)

        print(f"Indexed {filename}")

print("All logs indexed successfully")