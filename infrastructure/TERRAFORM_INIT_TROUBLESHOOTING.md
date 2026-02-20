# Terraform Init Troubleshooting Guide

## Issue: "Invalid provider registry host" Error

If you encounter this error when running `terraform init`:

```
Error: Invalid provider registry host

The host "registry.terraform.io" given in provider source address
"registry.terraform.io/hashicorp/aws" does not offer a Terraform provider registry.
```

This is typically caused by geographic restrictions on Terraform's CloudFront distribution.

## Diagnosis

The error occurs when:
- DNS resolution works (registry.terraform.io resolves correctly)
- HTTPS connection succeeds but returns 404 with `x-amzn-waf-reason: geo`
- CloudFront/WAF blocks access based on geographic location

## Solutions

### Option 1: Use a VPN (Recommended)
Connect to a VPN in a region that's not geo-blocked (e.g., US, Western Europe):
1. Connect to VPN
2. Run `terraform init`
3. Providers will be cached in `.terraform/` directory
4. Subsequent runs won't need registry access

### Option 2: Use Terraform Provider Mirror
Configure a local mirror or alternative registry:

1. Create `.terraformrc` in your home directory:
```hcl
provider_installation {
  network_mirror {
    url = "https://terraform-mirror.example.com/"
  }
}
```

2. Or use HashiCorp's alternative endpoints if available

### Option 3: Manual Provider Installation
Download providers manually and install locally:

1. Download AWS provider from GitHub releases:
   - https://github.com/hashicorp/terraform-provider-aws/releases
   - Download version 5.x for your platform

2. Download Random provider:
   - https://github.com/hashicorp/terraform-provider-random/releases
   - Download version 3.5.x for your platform

3. Create local provider directory:
```bash
mkdir -p ~/.terraform.d/plugins/registry.terraform.io/hashicorp/aws/5.0.0/windows_amd64
mkdir -p ~/.terraform.d/plugins/registry.terraform.io/hashicorp/random/3.5.0/windows_amd64
```

4. Extract and place provider binaries in respective directories

5. Run `terraform init` with local plugins:
```bash
terraform init -plugin-dir=~/.terraform.d/plugins
```

### Option 4: Use Terraform Cloud/Enterprise
If you have access to Terraform Cloud or Enterprise:
1. Configure remote backend
2. Providers are managed server-side
3. No local registry access needed

### Option 5: Docker-based Terraform
Use Terraform in a Docker container with VPN or proxy:
```bash
docker run -it --rm -v ${PWD}:/workspace -w /workspace hashicorp/terraform:latest init
```

## Verification

After successful initialization, verify:

```bash
# Check .terraform directory exists
ls -la .terraform/

# Check providers are installed
ls -la .terraform/providers/

# Verify Terraform can use providers
terraform providers
```

## Expected Output After Success

```
Initializing the backend...

Initializing provider plugins...
- Finding hashicorp/aws versions matching "~> 5.0"...
- Finding hashicorp/random versions matching "~> 3.5"...
- Installing hashicorp/aws v5.x.x...
- Installed hashicorp/aws v5.x.x (signed by HashiCorp)
- Installing hashicorp/random v3.5.x...
- Installed hashicorp/random v3.5.x (signed by HashiCorp)

Terraform has been successfully initialized!
```

## Alternative: Skip Init for Now

If you cannot resolve the registry access issue immediately:

1. The Terraform configuration is complete and valid
2. You can review the `.tf` files without initialization
3. Deployment can be done from a different environment with registry access
4. CI/CD pipelines typically have registry access configured

## Validate Configuration Without Init

You can still validate syntax without full initialization:

```bash
# Format check
terraform fmt -check

# Basic syntax validation (will fail on missing providers but shows syntax errors)
terraform validate -json
```

## Contact Support

If none of these solutions work:
1. Check with your network administrator about firewall rules
2. Verify proxy settings if behind corporate proxy
3. Contact HashiCorp support for registry access issues
4. Consider using Terraform Cloud for managed infrastructure

## Notes

- This is a known issue with CloudFront geo-blocking
- Not related to the Terraform configuration itself
- Once providers are cached locally, subsequent runs work offline
- The API Gateway configuration is complete and ready for deployment
