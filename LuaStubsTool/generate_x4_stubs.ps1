<#
.SYNOPSIS
  Generate x4_api_stubs.lua with parameter lists by scanning all Lua files
  in the unpacked X4 directory.

.DESCRIPTION
  This script searches every `.lua` file under the specified unpack directory,
  extracts global function definitions and their argument lists, and writes
  a stub file where each function is declared (with its parameters) and an empty body.
  Great for linters, IDE autocomplete, and CI.

.PARAMETER UnpackedDir
  Path to folder with all unpacked X4 _stubs (default: .\_unpacked).

.PARAMETER OutputFile
  Path to the generated Lua stub file (default: .\_stubs\x4_api_stubs.lua).

.EXAMPLE
  .\generate_x4_stubs.ps1 -UnpackedDir ".\_unpacked" -OutputFile ".\_stubs\x4_api_stubs.lua"
#>
param(
  [string]$UnpackedDir = ".\_unpacked",
  [string]$OutputFile = ".\_stubs\x4_api_stubs.lua"
)

# Regex matches:
# 1) function FuncName(arg1, arg2, ...)
# 2) FuncName = function(arg1, arg2, ...)
$pattern = '^[ \t]*(?:function[ \t]+([A-Za-z_][A-Za-z0-9_]*)[ \t]*\(([^)]*)\)|([A-Za-z_][A-Za-z0-9_]*)[ \t]*=[ \t]*function[ \t]*\(([^)]*)\))'

# Collect unique (name, args) pairs
$stubs = @{}

Get-ChildItem -Path $UnpackedDir -Recurse -Include *.lua,*.luac,*.LUA,*.lua.txt, *.txt |
ForEach-Object {
  Select-String -Path $_.FullName -Pattern $pattern |
  ForEach-Object {
    $m = $_.Matches[0]
    if ($m.Groups[1].Value) {
      $name = $m.Groups[1].Value
      $args = $m.Groups[2].Value.Trim()
    }
    else {
      $name = $m.Groups[3].Value
      $args = $m.Groups[4].Value.Trim()
    }
    # Normalize spacing: collapse multiple spaces around commas
    $args = ($args -split ',') | ForEach-Object { $_.Trim() } -join ', '
    $stubs[$name] = $args
  }
}

# Ensure output directory exists
$dir = Split-Path $OutputFile
if (-not (Test-Path $dir)) {
  New-Item -Path $dir -ItemType Directory | Out-Null
}

# Write header
"---@diagnostic disable: undefined-global, lowercase-global" |
Out-File -FilePath $OutputFile -Encoding UTF8

"" | Out-File -FilePath $OutputFile -Append -Encoding UTF8

# Emit each stub
foreach ($entry in $stubs.GetEnumerator() | Sort-Object Name) {
  $name = $entry.Name
  $args = $entry.Value
  # If no args, still include empty parentheses
  if ([string]::IsNullOrWhiteSpace($args)) { $args = "" }
  "function $name($args) end" |
  Out-File -FilePath $OutputFile -Append -Encoding UTF8
}

Write-Host "Generated stubs with parameters: $OutputFile" -ForegroundColor Green
Write-Host "Total functions: $($stubs.Count)" -ForegroundColor Green
