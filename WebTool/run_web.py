import http.server
import socketserver
import socket
import os
import json
import urllib.parse

def get_local_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        local_ip = s.getsockname()[0]
        s.close()
        return local_ip
    except Exception as e:
        print(f"Error getting local IP: {e}")
        return None

class CustomHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        parsed_path = urllib.parse.urlparse(self.path)
        # API endpoint: /api?folder=folder_path
        if parsed_path.path == '/api':
            query = urllib.parse.parse_qs(parsed_path.query)
            folder = query.get("folder", ["."])[0]  # default: current directory (root)
            # Prevent directory traversal
            if ".." in folder:
                self.send_error(400, "Invalid folder parameter.")
                return
            folder_path = os.path.join(os.getcwd(), folder)
            if os.path.isdir(folder_path):
                items = []
                normalized_folder = os.path.normpath(folder)
                # If not at the root folder, add a parent directory entry
                if normalized_folder != ".":
                    parent = os.path.dirname(normalized_folder)
                    if parent == "":
                        parent = "."
                    items.append({
                        "name": "..",
                        "path": "/" + parent.replace("\\", "/"),
                        "type": "directory"
                    })
                # List all directories and allowed files
                for entry in os.scandir(folder_path):
                    if entry.is_dir():
                        items.append({
                            "name": entry.name,
                            "path": "/" + os.path.relpath(entry.path, os.getcwd()).replace("\\", "/"),
                            "type": "directory"
                        })
                    elif entry.is_file() and entry.name.lower().endswith(('.xml', '.xsl', '.xsd')):
                        items.append({
                            "name": entry.name,
                            "path": "/" + os.path.relpath(entry.path, os.getcwd()).replace("\\", "/"),
                            "type": "file"
                        })
                # Sort items: directories first, then files; both alphabetically
                items.sort(key=lambda x: (0 if x["type"] == "directory" else 1, x["name"].lower()))
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps(items).encode('utf-8'))
            else:
                self.send_error(404, f"Folder '{folder}' not found.")
            return

        # Otherwise, serve files normally (raw access)
        super().do_GET()

def main():
    try:
        port = int(input("Enter port (default 8080): ") or 8080)
        local_ip = get_local_ip()
        if local_ip:
            print("Server running at:\n")
            print(f"- LAN: http://{local_ip}:{port}")
            print(f"- Localhost: http://localhost:{port}")
            # Set working directory to the script's folder
            os.chdir(os.path.dirname(os.path.abspath(__file__)))
            with socketserver.TCPServer(("", port), CustomHandler) as httpd:
                print(f"\nServing at port -> {port}")
                httpd.serve_forever()
        else:
            print("Unable to determine local IP. Exiting.")
    except ValueError:
        print("Invalid port number. Please enter a valid integer.")
    except KeyboardInterrupt:
        print("\nServer stopped by user.")

if __name__ == "__main__":
    main()
