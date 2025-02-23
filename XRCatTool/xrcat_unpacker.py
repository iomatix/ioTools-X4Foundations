import os
import sys
import subprocess
import io
from pathlib import Path

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

def sanitize_path(path_str: str) -> str:
    """Trim surrounding quotes and trailing backslashes from a path string."""
    return path_str.strip('"\'').rstrip('\\')

def resolve_dir(path_str: str, context: str = "path") -> Path:
    """Resolve a directory path, ensuring it exists and has no trailing slashes."""
    sanitized = sanitize_path(path_str)
    
    try:
        path = Path(sanitized).resolve(strict=True)
        if not path.is_dir():
            raise NotADirectoryError(f"{context} is not a directory: {path}")
        return path
    except Exception as e:
        print(f"{bcolors.FAIL}Error: Invalid {context}. {e}{bcolors.ENDC}")
        sys.exit(1)
        
def resolve_file(path_str: str) -> Path:
    """Resolve a file path, ensuring it exists and has no trailing slashes."""
    sanitized = sanitize_path(path_str)
    try:
        path = Path(sanitized).resolve(strict=True)
        if not path.is_file():
            raise FileNotFoundError(f"Not a file: {path}")
        return path
    except Exception as e:
        print(f"{bcolors.FAIL}Error: Invalid file. {e}{bcolors.ENDC}")
        sys.exit(1)

def print_usage():
    print("Usage:")
    print("  python xrcat_unpacker.py [current_dir] [output_dir] [xrcattool_path] [files]")
    print("")
    print("  [files] is a list of quoted .cat file paths separated by spaces.")
    print("  Provided by the batch script based on user input or file_list.txt.")
    print("")
    print("  If any of the paths are not valid, the script will exit.")
    print("  Check if the provided paths are valid and the files exist.")
    print("")
    print("Example:")
    print(r'  python xrcat_unpacker.py "C:\MyProject" "C:\MyProject\Unpacked" "C:\XRCatTool\XRCatTool.exe" "file1.cat" "file2.cat"')
    sys.exit(1)

def main():
    if len(sys.argv) < 5:
        print(f"{bcolors.FAIL}Error: Not enough arguments.{bcolors.ENDC}")
        print_usage()
        input("Press Enter to exit...")
        sys.exit(1)
    
    print(f"{bcolors.OKBLUE}Called with arguments:{bcolors.ENDC}")
    for i, arg in enumerate(sys.argv):
        print(f"{bcolors.OKBLUE}[{i}]{bcolors.ENDC} {arg}")

    # Sanitize and validate paths
    current_dir = resolve_dir(sys.argv[1], "current directory")
    output_dir = resolve_dir(sys.argv[2], "output directory")
    xrcattool_path = resolve_file(sys.argv[3])
 
    print(f"{bcolors.OKBLUE}Loading XRCatTool Unpacker...{bcolors.ENDC}")
    print(f"\nXRCatTool Unpacker \n - Current Dir: {current_dir},\n - Output Dir: {output_dir},\n - XRCatTool: {xrcattool_path}\n")
    
    # Process files (sanitize and validate each)
    files = []
    for file_arg in sys.argv[4:]:
        try:
            file_path = resolve_file(file_arg)
            files.append(file_path)
        except Exception as e:
            print(f"{bcolors.WARNING}Warning: Skipping invalid file '{file_arg}'. {e}{bcolors.ENDC}")
    
    print(f"{bcolors.OKBLUE}Unpacking {bcolors.OKCYAN}{len(files)} {bcolors.OKBLUE}files...{bcolors.ENDC}\n")
        
    if not files:
        print(f"{bcolors.FAIL}Error: No valid .cat files provided.{bcolors.ENDC}")
        input("Press Enter to exit...")
        sys.exit(1)

    error_flag = False
    for file_path in files:
        print(f"\nProcessing: {bcolors.OKCYAN}{file_path}{bcolors.ENDC}")
        try:
            # Build output subdirectory structure
            try:
                rel_path = file_path.relative_to(current_dir)
                output_subdir = output_dir / rel_path.parent
            except ValueError:
                print(f"{bcolors.WARNING}File not under current dir. Using absolute path structure.{bcolors.ENDC}")
                rel_path = file_path.relative_to(file_path.anchor)  # Remove drive letter
                output_subdir = output_dir / rel_path.parent

            output_subdir.mkdir(parents=True, exist_ok=True)

            # Run XRCatTool command
            cmd = [
                str(xrcattool_path),
                "-in", str(file_path),
                "-out", str(output_subdir)
            ]
            subprocess.run(cmd, check=True, cwd=str(current_dir))
            print(f"{bcolors.OKGREEN}Successfully unpacked to: {output_subdir}{bcolors.ENDC}")

        except subprocess.CalledProcessError as e:
            print(f"{bcolors.FAIL}XRCatTool error: {e}{bcolors.ENDC}")
            error_flag = True
        except Exception as e:
            print(f"{bcolors.FAIL}Unexpected error: {e}{bcolors.ENDC}")
            error_flag = True

    sys.exit(1 if error_flag else 0)

if __name__ == "__main__":
    main()