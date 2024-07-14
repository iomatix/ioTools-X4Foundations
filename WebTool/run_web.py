import http.server
import socketserver
import socket
import sys

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
    
def main():
    try:
        port = int(input("Enter a custom port (default 8080): ") or 8080)
        local_ip = get_local_ip()
        if local_ip:
            print(f"Server running at:")
            print(f"Local IP (LAN): http://{local_ip}:{port}")
            print(f"Localhost: http://localhost:{port}")
            Handler = http.server.SimpleHTTPRequestHandler
            with socketserver.TCPServer(("", port), Handler) as httpd:
                print(f"Serving at port {port}")
                httpd.serve_forever()
        else:
            print("Unable to determine local IP. Exiting.")
    except ValueError:
        print("Invalid port number. Please enter a valid integer port.")
    except KeyboardInterrupt:
        print("\nServer stopped by user.")

if __name__ == "__main__":
    main()
