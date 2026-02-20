# Generate random password for database (POC - for production use Secrets Manager)
resource "random_password" "db_password" {
  length  = 32
  special = false
}

# Secrets Manager removed for POC - credentials passed via environment variables
# For production, use AWS Secrets Manager for secure credential storage

# Security Group for RDS
resource "aws_security_group" "database" {
  name        = "${var.project_name}-${var.environment}-database-sg"
  description = "Security group for ShopPulse Analytics RDS PostgreSQL"
  vpc_id      = aws_vpc.main.id

  tags = {
    Name = "${var.project_name}-${var.environment}-database-sg"
  }
}

# Allow PostgreSQL access from anywhere (POC only - not for production!)
resource "aws_security_group_rule" "database_ingress_public" {
  type              = "ingress"
  from_port         = 5432
  to_port           = 5432
  protocol          = "tcp"
  cidr_blocks       = ["0.0.0.0/0"]
  security_group_id = aws_security_group.database.id
  description       = "Allow PostgreSQL from anywhere (POC only)"
}

# DB Subnet Group (using public subnets for POC)
resource "aws_db_subnet_group" "database" {
  name       = "${var.project_name}-${var.environment}-db-subnet-group"
  subnet_ids = aws_subnet.public[*].id

  tags = {
    Name = "${var.project_name}-${var.environment}-db-subnet-group"
  }
}

# DB Parameter Group
resource "aws_db_parameter_group" "postgres" {
  name   = "${var.project_name}-${var.environment}-postgres-params"
  family = "postgres17"  # Updated to match engine version 17

  parameter {
    name         = "shared_preload_libraries"
    value        = "pg_stat_statements"
    apply_method = "pending-reboot"  # Static parameter requires reboot
  }

  parameter {
    name  = "log_statement"
    value = "all"
  }

  parameter {
    name  = "log_min_duration_statement"
    value = "1000"
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-postgres-params"
  }
}

# RDS PostgreSQL Instance
resource "aws_db_instance" "postgres" {
  identifier     = "${var.project_name}-${var.environment}-db"
  engine         = "postgres"
  instance_class = var.db_instance_class

  allocated_storage = var.db_allocated_storage
  storage_type      = "gp3"
  storage_encrypted = true

  db_name  = var.db_name
  username = var.db_username
  password = random_password.db_password.result

  db_subnet_group_name   = aws_db_subnet_group.database.name
  vpc_security_group_ids = [aws_security_group.database.id]
  parameter_group_name   = aws_db_parameter_group.postgres.name

  multi_az                = false
  publicly_accessible     = true  # POC only - allows direct access
  backup_retention_period = 0
  skip_final_snapshot     = true
  deletion_protection     = false

  # Disable costly features for POC
  enabled_cloudwatch_logs_exports       = []
  performance_insights_enabled          = false

  tags = {
    Name = "${var.project_name}-${var.environment}-postgres"
  }
}

# RDS Proxy removed for POC to reduce costs
# Lambda functions will connect directly to RDS
