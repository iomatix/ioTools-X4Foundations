<#
.SYNOPSIS
  Generate x4_api_stubs.lua by scanning all Lua files in the unpacked X4 directory.

.DESCRIPTION
  This script walks through every .lua file under the specified unpack directory,
  extracts global function definitions, and writes a stub file where each function
  is declared with an empty body. Useful for linters and IDE autocompletion.

.PARAMETER UnpackedDir
  Path to the folder containing all unpacked X4 scripts (default: .\_unpacked).

.PARAMETER OutputFile
  Path to the generated Lua stub file (default: .\_stubs\x4_api_stubs.lua).

.EXAMPLE
  .\generate_x4_stubs.ps1 -UnpackedDir ".\_unpacked" -OutputFile ".\_stubs\x4_api_stubs.lua"
#>
param(
    [string]$UnpackedDir = ".\_unpacked",
    [string]$OutputFile  = ".\_stubs\x4_api_stubs.lua"
)

# Regex to match both styles of function definitions:
#   1) function FuncName(...)
#   2) FuncName = function(...)
$pattern = '^[ \t]*(?:function[ \t]+([A-Za-z_][A-Za-z0-9_]*)|([A-Za-z_][A-Za-z0-9_]*)[ \t]*=[ \t]*function)[ \t]*\('

# Collect unique function names from all .lua files
$functions = Get-ChildItem -Path $UnpackedDir -Recurse -Include *.lua |
    ForEach-Object {
        Select-String -Path $_.FullName -Pattern $pattern
    } |
    ForEach-Object {
        # If group 1 matched, that's the name; otherwise group 2
        if ($_.Matches[0].Groups[1].Value) {
            $_.Matches[0].Groups[1].Value
        }
        else {
            $_.Matches[0].Groups[2].Value
        }
    } |
    Sort-Object -Unique

# Ensure output directory exists
$dir = Split-Path $OutputFile
if (-not (Test-Path $dir)) {
    New-Item -Path $dir -ItemType Directory | Out-Null
}

# Write diagnostic header
"---@diagnostic disable: undefined-global, lowercase-global" |
    Out-File -FilePath $OutputFile -Encoding UTF8

# Blank line for readability
"" |
    Out-File -FilePath $OutputFile -Encoding UTF8 -Append

# Write each function stub
foreach ($fn in $functions) {
    "function $fn() end" |
        Out-File -FilePath $OutputFile -Encoding UTF8 -Append
}

Write-Host "Generated stub file: $OutputFile" -ForegroundColor Green
Write-Host "Total functions: $($functions.Count)" -ForegroundColor Green