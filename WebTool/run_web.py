import http.server
import socketserver
import socket
import os
import json
import urllib.parse
import subprocess  # used to launch the external program

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
        
        # Endpoint to launch external program: /launch?file=relative/path/to/file
        if parsed_path.path == '/launch':
            query = urllib.parse.parse_qs(parsed_path.query)
            file_param = query.get("file", [None])[0]
            if not file_param:
                self.send_error(400, "No file specified.")
                return
            # Prevent directory traversal by rejecting '..'
            if ".." in file_param:
                self.send_error(400, "Invalid file parameter.")
                return
            file_path = os.path.join(os.getcwd(), file_param.lstrip("/"))
            if not os.path.isfile(file_path):
                self.send_error(404, "File not found.")
                return
            # Allow only certain file types
            if not file_path.lower().endswith(('.xml', '.xsl', '.xsd')):
                self.send_error(400, "Invalid file type for external launch.")
                return
            try:
                # Launch external program. Adjust the command below as needed.
                # For example, Notepad++ is free and widely used.
                subprocess.Popen(["notepad++.exe", file_path])
                self.send_response(200)
                self.send_header('Content-type', 'text/plain')
                self.end_headers()
                self.wfile.write(f"Launched external program for {file_param}".encode('utf-8'))
            except Exception as e:
                self.send_error(500, f"Error launching external program: {e}")
            return

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
