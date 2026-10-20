# A3 · Construye dos veces desde cero (git archive HEAD) y compara docs/ contra el docs/ versionado.
# Uso (PowerShell): .\a3_construir_dos_veces.ps1 -Copia C:\ruta\corta\a\la\copia
param([string]$Copia = "X:\r1")
foreach ($n in 'b1','b2') {
  Push-Location "$Copia\_aud\$n"
  Remove-Item Env:SIA_ESRI_KEY,Env:SIA_SESION_INICIO,Env:SIA_SESION_CIERRE,Env:SIA_SESION_USO -ErrorAction SilentlyContinue
  $env:PYTHONIOENCODING='utf-8'
  python 02_fuente/construir.py
  "exit $n = $LASTEXITCODE"
  Pop-Location
}
python "$PSScriptRoot\a3_comparar.py" "$Copia\docs" "$Copia\_aud\b1\docs" "$Copia\_aud\b2\docs"
