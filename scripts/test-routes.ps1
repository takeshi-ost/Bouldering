$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$node = Get-Command node -ErrorAction SilentlyContinue

if ($node) {
    $runtime = $node.Source
} else {
    $runtime = Join-Path $env:LOCALAPPDATA 'Programs/Microsoft VS Code/Code.exe'
    if (-not (Test-Path -LiteralPath $runtime)) {
        throw 'Neither Node.js nor VS Code was found. Install Node.js and retry.'
    }
    $env:ELECTRON_RUN_AS_NODE = '1'
}

try {
    $tests = @((Join-Path $root 'tests/routes.cjs'), (Join-Path $root 'tests/animations.cjs'))
    foreach ($test in $tests) {
        $arguments = @($test)
        if ($node) {
            & $runtime @arguments
            $exitCode = $LASTEXITCODE
        } else {
            $process = Start-Process -FilePath $runtime -ArgumentList $arguments -WorkingDirectory $env:TEMP -Wait -PassThru -NoNewWindow
            $exitCode = $process.ExitCode
        }
        if ($exitCode -ne 0) {
            throw "Route verification failed in $test (exit code $exitCode)."
        }
    }
} finally {
    if (-not $node) {
        Remove-Item Env:ELECTRON_RUN_AS_NODE -ErrorAction SilentlyContinue
    }
}
