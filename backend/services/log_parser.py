import os
import csv
import json

def parse_file_to_chunks(filepath):
    chunks = []
    
    # Safeguard against directories or non-existent files
    if not filepath or not os.path.exists(filepath) or not os.path.isfile(filepath):
        print(f"Skipping: {filepath} is not a valid file.")
        return chunks

    _, ext = os.path.splitext(filepath.lower())
    
    try:
        if ext == ".pdf":
            import importlib
            pypdf = importlib.import_module("pypdf")
            reader = pypdf.PdfReader(filepath)
            for idx, page in enumerate(reader.pages):
                text = page.extract_text() or ""
                if text.strip():
                    chunks.append({
                        "content": text.strip(),
                        "metadata": {"page": idx + 1, "data_type": "pdf"}
                    })
        elif ext == ".csv":
            with open(filepath, "r", encoding="utf-8-sig", errors="ignore") as f:
                reader = csv.DictReader(f)
                for idx, row in enumerate(reader):
                    # Skip rows that are completely empty or have only empty/None values
                    if not row or not any(str(v).strip() for v in row.values() if v is not None):
                        continue
                    
                    row_str = " | ".join([f"{k}: {v}" for k, v in row.items() if k is not None])
                    if row_str.strip():
                        chunks.append({
                            "content": row_str,
                            "metadata": {"row": idx + 1, "data_type": "csv"}
                        })
        elif ext == ".json":
            with open(filepath, "r", encoding="utf-8-sig", errors="ignore") as f:
                data = json.load(f)
                if isinstance(data, list):
                    for idx, item in enumerate(data):
                        chunks.append({
                            "content": json.dumps(item, indent=2),
                            "metadata": {"item_index": idx, "data_type": "json"}
                        })
                elif isinstance(data, dict):
                    for key, val in data.items():
                        chunks.append({
                            "content": f"{key}: {json.dumps(val, indent=2)}",
                            "metadata": {"key": key, "data_type": "json"}
                        })
                else:
                    chunks.append({
                        "content": str(data),
                        "metadata": {"data_type": "json"}
                    })
        else:
            # Fallback for log, txt, md, xml, yaml, etc.
            with open(filepath, "r", encoding="utf-8-sig", errors="ignore") as f:
                lines = f.readlines()
            
            chunk_size = 20
            for i in range(0, len(lines), chunk_size):
                chunk_lines = lines[i:i+chunk_size]
                chunk_text = "".join(chunk_lines).strip()
                if chunk_text:
                    chunks.append({
                        "content": chunk_text,
                        "metadata": {
                            "start_line": i + 1,
                            "end_line": min(i + chunk_size, len(lines)),
                            "data_type": ext.strip(".") or "txt"
                        }
                    })
    except Exception as e:
        print(f"Error parsing file {filepath}: {str(e)}")
        # Ultimate fallback: read raw file contents
        try:
            with open(filepath, "r", encoding="utf-8-sig", errors="ignore") as f:
                content = f.read().strip()
                if content:
                    chunks.append({
                        "content": content,
                        "metadata": {"data_type": "raw_text"}
                    })
        except Exception as inner_e:
            print(f"Ultimate fallback failed for {filepath}: {str(inner_e)}")
            
    return chunks

def read_logs(filepath):
    try:
        if not filepath or not os.path.exists(filepath) or not os.path.isfile(filepath):
            return ""
            
        _, ext = os.path.splitext(filepath.lower())
        # For standard text files, read directly for performance and accuracy
        if ext not in [".pdf", ".csv", ".json"]:
            with open(filepath, "r", encoding="utf-8-sig", errors="ignore") as f:
                return f.read()
                
        # For structured formats, parse and join
        chunks = parse_file_to_chunks(filepath)
        if not chunks:
            return ""
        return "\n\n".join([c["content"] for c in chunks])
    except Exception as e:
        print("ERROR:", str(e))
        return f"Error reading log file: {str(e)}"