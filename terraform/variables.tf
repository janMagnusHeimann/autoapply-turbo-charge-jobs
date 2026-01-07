# Variables for Terraform configuration

variable "project_id" {
  description = "GCP Project ID"
  type        = string
}

variable "region" {
  description = "GCP Region"
  type        = string
  default     = "us-central1"
}

variable "zone" {
  description = "GCP Zone"
  type        = string
  default     = "us-central1-a"
}

variable "environment" {
  description = "Environment (dev, staging, prod)"
  type        = string
  default     = "prod"
}

# API Keys and Secrets
variable "openai_api_key" {
  description = "OpenAI API Key"
  type        = string
  sensitive   = true
}

variable "supabase_url" {
  description = "Supabase URL"
  type        = string
}

variable "supabase_service_key" {
  description = "Supabase Service Role Key"
  type        = string
  sensitive   = true
}

variable "github_client_id" {
  description = "GitHub OAuth Client ID"
  type        = string
}

variable "github_client_secret" {
  description = "GitHub OAuth Client Secret"
  type        = string
  sensitive   = true
}

# Scaling Configuration
variable "min_instances" {
  description = "Minimum number of Cloud Run instances"
  type        = number
  default     = 0
}

variable "max_instances" {
  description = "Maximum number of Cloud Run instances"
  type        = number
  default     = 100
}

variable "max_concurrent_requests" {
  description = "Maximum concurrent requests per instance"
  type        = number
  default     = 80
}

# Database Configuration
variable "database_tier" {
  description = "Cloud SQL instance tier"
  type        = string
  default     = "db-f1-micro"  # Start small, scale as needed
}

variable "database_disk_size" {
  description = "Database disk size in GB"
  type        = number
  default     = 10
}

variable "redis_memory_size" {
  description = "Redis memory size in GB"
  type        = number
  default     = 1
}

# Monitoring
variable "alert_email" {
  description = "Email for monitoring alerts"
  type        = string
}

# Feature Flags
variable "enable_redis" {
  description = "Enable Redis/Memorystore"
  type        = bool
  default     = true
}

variable "enable_cloud_sql" {
  description = "Enable Cloud SQL (alternative to Supabase)"
  type        = bool
  default     = false  # Use Supabase by default
}

variable "enable_cloud_tasks" {
  description = "Enable Cloud Tasks (alternative to Celery)"
  type        = bool
  default     = true
}

variable "cors_allowed_origins" {
  description = "Comma-separated list of allowed CORS origins (e.g., Vercel URL)"
  type        = string
  default     = "*"
}