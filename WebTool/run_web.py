import http.server
import shutil
import socketserver
import socket
import os
import json
import urllib.parse
import subprocess  # used to launch the external program
import platform

class bcolors:
    HEADER = '\033[95m'
    OKBLUE = '\033[94m'
    OKCYAN = '\033[96m'
    OKGREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'
    UNDERLINE = '\033[4m'

def get_local_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        local_ip = s.getsockname()[0]
        s.close()
        return local_ip
    except Exception as e:
        print(f"{bcolors.FAIL}Error getting local IP: {e}{bcolors.ENDC}")
        return None

class CustomHandler(http.server.SimpleHTTPRequestHandler):
    external_xml_editor = None
    SAFE_EXTENSIONS = ('.xml', '.xsl', '.xsd', '.xls', '.xlsx')
    bcolors = bcolors  # Reference to the color class

    def validate_path(self, path_param, base_dir=None):
        """Validate and normalize path to prevent directory traversal."""
        try:
            decoded = urllib.parse.unquote(urllib.parse.unquote(path_param))
            if base_dir is None:
                base_dir = os.getcwd()
            
            if not path_param:
                return None, "Empty path parameter"
            
            # Normalize and resolve path
            relative_path = path_param.lstrip("/")
            requested_path = os.path.normpath(os.path.join(base_dir, relative_path))
            
            # Verify the resolved path is within base directory
            if not os.path.commonpath([base_dir]) == os.path.commonpath([base_dir, requested_path]):
                return None, "Invalid path parameter"
            
            return requested_path, None
        except Exception as e:
            return None, f"Path validation error: {e}"

    def send_text_response(self, code, text):
        """Helper to send plain text responses."""
        self.send_response(code)
        self.send_header('Content-type', 'text/plain; charset=utf-8')
        self.end_headers()
        self.wfile.write(text.encode('utf-8'))

    def send_json_response(self, code, data):
        """Helper to send JSON responses."""
        self.send_response(code)
        self.send_header('Content-type', 'application/json; charset=utf-8')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode('utf-8'))

    def handle_api_request(self, folder_param):
        """Handle API directory listing requests."""
        try:
            folder_path, error = self.validate_path(folder_param)
            if error:
                self.send_error(400, error)
                return

            if not os.path.isdir(folder_path):
                self.send_error(404, f"Folder '{folder_param}' not found")
                return

            items = []
            normalized_folder = os.path.normpath(folder_param)
            
            # Add parent directory if not at root
            if normalized_folder != ".":
                parent = os.path.dirname(normalized_folder)
                items.append({
                    "name": "..",
                    "path": f"/{parent}" if parent else "/",
                    "type": "directory"
                })

            # Scan directory with context manager
            with os.scandir(folder_path) as entries:
                for entry in entries:
                    if entry.is_dir():
                        items.append({
                            "name": entry.name,
                            "path": f"/{os.path.relpath(entry.path, os.getcwd()).replace('\\', '/')}",
                            "type": "directory"
                        })
                    elif entry.is_file() and entry.name.lower().endswith(self.SAFE_EXTENSIONS):
                        items.append({
                            "name": entry.name,
                            "path": f"/{os.path.relpath(entry.path, os.getcwd()).replace('\\', '/')}",
                            "type": "file"
                        })

            # Sort directories first then files
            items.sort(key=lambda x: (x["type"] == "directory", x["name"].lower()))
            self.send_json_response(200, items)

        except OSError as e:
            self.send_error(500, f"Directory access error: {e}")
            print(f"{self.bcolors.FAIL}OSError in API request: {e}{self.bcolors.ENDC}")
        except Exception as e:
            self.send_error(500, f"Unexpected error: {e}")
            print(f"{self.bcolors.FAIL}Error in API request: {e}{self.bcolors.ENDC}")

    def handle_launch_request(self, file_param):
        """Handle external program launch requests."""
        try:
            if not self.external_xml_editor:
                raise ValueError("External editor not configured")

            file_path, error = self.validate_path(file_param)
            if error:
                self.send_error(400, error)
                return

            if not os.path.isfile(file_path):
                self.send_error(404, "File not found")
                return

            if not file_path.lower().endswith(self.SAFE_EXTENSIONS):
                self.send_error(400, "Invalid file type")
                return

            # Launch editor
            subprocess.Popen([self.external_xml_editor, file_path])
            self.send_text_response(200, 
                f"Launching external program for {file_param}.\n\nPlease wait...")

        except subprocess.SubprocessError as e:
            self.send_error(500, f"Editor launch failed: {e}")
            print(f"{self.bcolors.FAIL}Subprocess error: {e}{self.bcolors.ENDC}")
        except Exception as e:
            self.send_error(500, f"Launch error: {e}")
            print(f"{self.bcolors.FAIL}Launch error: {e}{self.bcolors.ENDC}")

    def do_GET(self):
        try:
            parsed_path = urllib.parse.urlparse(self.path)
            
            if parsed_path.path == '/launch':
                query = urllib.parse.parse_qs(parsed_path.query)
                file_param = query.get("file", [None])[0]
                if not file_param:
                    self.send_error(400, "Missing file parameter")
                    return
                self.handle_launch_request(file_param)
                return

            if parsed_path.path == '/api':
                query = urllib.parse.parse_qs(parsed_path.query)
                folder = query.get("folder", ["."])[0]
                self.handle_api_request(folder)
                return

            # Fallback to default implementation
            super().do_GET()

        except Exception as e:
            self.send_error(500, f"Server error: {e}")
            print(f"{self.bcolors.FAIL}General handler error: {e}{self.bcolors.ENDC}")


### Globals Library
library_ioWebApp_settings = {
    "xml_editor": None,
    "port": None,
    "local_ip": None
}

def setup_external_xml_editor():
    default_editor = ("_run_XmlNotepad.bat" if platform.system() == "Windows" else "gedit")
    try:
        # Get user input with timeout
        editor = input(
            f"Enter external editor command ({bcolors.WARNING}default: {default_editor}{bcolors.ENDC}): "
        ) or default_editor
        # Basic validation
        if not shutil.which(editor.split()[0]):
            raise ValueError(f"Editor executable not found: {editor}")
        CustomHandler.external_xml_editor = editor
        print(f"{bcolors.OKGREEN}Using editor: {editor}{bcolors.ENDC}")

    except Exception as e:
        print(f"{bcolors.FAIL}Error configuring editor: {e}{bcolors.ENDC}")
        print(f"{bcolors.WARNING}Falling back to default: {default_editor}{bcolors.ENDC}")
        CustomHandler.external_xml_editor = default_editor

def setup_protocols():
    try:
        library_ioWebApp_settings["port"] = int(input(f"Enter port ({bcolors.WARNING}default 8080{bcolors.ENDC}): ") or 8080)
    except ValueError:
        print(f"{bcolors.WARNING}Invalid port number.{bcolors.BOLD}Please enter a valid integer value.{bcolors.ENDC}")
        setup_protocols()
    except Exception as e:
        print(f"{bcolors.FAIL}Error setting up port number: {e}{bcolors.ENDC}")
        print(f"{bcolors.WARNING}Using default port number: {library_ioWebApp_settings["port"]}{bcolors.ENDC}")

def run_webapp_server():
    global library_ioWebApp_settings # import global library
    
    port = library_ioWebApp_settings["port"]
    local_ip = library_ioWebApp_settings["local_ip"] or get_local_ip()
    try:
        if local_ip:
            print(f"{bcolors.HEADER}{bcolors.BOLD}Server running at:{bcolors.ENDC}")
            print(f"- {bcolors.BOLD}Localhost: {bcolors.OKGREEN}{bcolors.UNDERLINE}http://localhost:{port}{bcolors.ENDC}")
            print(f"- {bcolors.BOLD}LAN: {bcolors.OKCYAN}{bcolors.UNDERLINE}http://{local_ip}:{port}{bcolors.ENDC}")
            # Set working directory to the script's folder
            os.chdir(os.path.dirname(os.path.abspath(__file__)))
            with socketserver.TCPServer(("", port), CustomHandler) as httpd:
                print(f"\n{bcolors.HEADER}Serving at port -> {bcolors.OKBLUE}{bcolors.BOLD}{port}{bcolors.ENDC}\n")
                httpd.serve_forever()
        else:
            print(f"{bcolors.FAIL}{bcolors.BOLD}Unable to determine local IP. Exiting.{bcolors.ENDC}") 
            input(f"{bcolors.WARNING}Press Enter to exit...{bcolors.ENDC}")
            exit(1)
    except Exception as e: # Catch any exceptions during server setup or running
        print(f"{bcolors.FAIL}Unable to start server: {e}{bcolors.ENDC}")
        input(f"{bcolors.WARNING}Press Enter to exit...{bcolors.ENDC}")
        exit(1)
        

def main():
    try:
        setup_protocols()
        setup_external_xml_editor()
        run_webapp_server()
    except KeyboardInterrupt:
        print(f"\n{bcolors.OKBLUE}{bcolors.BOLD}Server stopped by user.{bcolors.ENDC}")
        input(f"{bcolors.WARNING}Press Enter to exit...{bcolors.ENDC}")
        exit(1)  
    except Exception as e:
        print(f"{bcolors.FAIL}Error: {e}{bcolors.ENDC}")
        input(f"{bcolors.WARNING}Press Enter to exit...{bcolors.ENDC}")
        exit(1)        


if __name__ == "__main__":
    main()
