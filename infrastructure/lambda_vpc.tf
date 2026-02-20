# Lambda VPC configuration removed for POC
# Lambda functions will run without VPC attachment to:
# 1. Avoid NAT Gateway costs (~$32/month)
# 2. Simplify networking
# 3. Enable direct internet access for AWS API calls
#
# RDS is publicly accessible, so Lambda can connect directly
# Security is maintained through:
# - RDS security group (restricts access by IP if needed)
# - Database username/password authentication
# - Secrets Manager for credential storage
