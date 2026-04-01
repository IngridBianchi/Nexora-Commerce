# setup-cdn.ps1
# Crea la distribucion CloudFront para imagenes de productos de Nexora.
#
# REQUISITOS:
#   - AWS CLI configurado con un usuario/rol con permiso cloudfront:CreateDistribution
#   - El bucket S3 ya debe existir (se crea via serverless deploy)
#   - Ejecutar una sola vez por stage; los deploys posteriores no requieren este script
#
# USO:
#   .\scripts\setup-cdn.ps1 -Stage dev
#   .\scripts\setup-cdn.ps1 -Stage prod

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("dev","stage","prod")]
    [string]$Stage,

    [string]$Region = "us-east-1"
)

$ErrorActionPreference = "Stop"

$BucketName = "nexora-backend-$Stage-product-images"
$Comment    = "Nexora product images CDN ($Stage)"

Write-Host "==> Verificando bucket S3: $BucketName" -ForegroundColor Cyan
aws s3api head-bucket --bucket $BucketName --region $Region 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Error "El bucket '$BucketName' no existe. Ejecuta primero: npx serverless deploy --stage $Stage"
    exit 1
}

$Origin = "$BucketName.s3.$Region.amazonaws.com"

Write-Host "==> Creando distribucion CloudFront apuntando a: $Origin" -ForegroundColor Cyan

$DistroConfig = @{
    Comment = $Comment
    Enabled = $true
    HttpVersion = "http2"
    PriceClass = "PriceClass_100"
    Origins = @{
        Quantity = 1
        Items = @(
            @{
                Id = "ProductImagesS3Origin"
                DomainName = $Origin
                S3OriginConfig = @{ OriginAccessIdentity = "" }
            }
        )
    }
    DefaultCacheBehavior = @{
        TargetOriginId = "ProductImagesS3Origin"
        ViewerProtocolPolicy = "redirect-to-https"
        CachePolicyId = "658327ea-f89d-4fab-a63d-7e88639e58f6"
        AllowedMethods = @{
            Quantity = 2
            Items = @("GET","HEAD")
            CachedMethods = @{ Quantity = 2; Items = @("GET","HEAD") }
        }
        Compress = $true
    }
    CallerReference = "nexora-$Stage-$(Get-Date -Format 'yyyyMMddHHmmss')"
} | ConvertTo-Json -Depth 20 -Compress

$TempConfigPath = Join-Path $env:TEMP "nexora-cloudfront-$Stage-config.json"
Set-Content -Path $TempConfigPath -Value $DistroConfig -Encoding ascii

try {
    $Result = aws cloudfront create-distribution `
        --distribution-config "file://$TempConfigPath" `
        --query "Distribution.{Id:Id,DomainName:DomainName,Status:Status}" `
        --output json 2>&1
}
finally {
    Remove-Item -Path $TempConfigPath -ErrorAction SilentlyContinue
}

if ($LASTEXITCODE -ne 0) {
    Write-Error "Fallo al crear la distribucion CloudFront:`n$Result"
    exit 1
}

$Parsed = $Result | ConvertFrom-Json
Write-Host ""
Write-Host "==> Distribucion CloudFront creada exitosamente" -ForegroundColor Green
Write-Host "    ID:         $($Parsed.Id)"
Write-Host "    Domain:     https://$($Parsed.DomainName)"
Write-Host "    Status:     $($Parsed.Status)  (puede tardar 10-15 min en propagar)"
Write-Host ""
Write-Host "Agrega esta URL a tu .env.local del frontend:" -ForegroundColor Yellow
Write-Host "    PRODUCT_IMAGES_CDN_URL=https://$($Parsed.DomainName)"
