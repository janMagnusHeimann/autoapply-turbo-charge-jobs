# Variables for Cloud Run module

variable "project_id" {
  description = "GCP Project ID"
  type        = string
}

variable "region" {
  description = "GCP Region"
  type        = string
}

variable "service_name" {
  description = "Cloud Run service name"
  type        = string
}

variable "service_port" {
  description = "Service port"
  type        = number
}

variable "dockerfile_path" {
  description = "Path to Dockerfile"
  type        = string
}

variable "env_vars" {
  description = "Environment variables"
  type        = map(string)
  default     = {}
}

variable "redis_host" {
  description = "Redis host"
  type        = string
}

variable "database_url" {
  description = "Database connection string"
  type        = string
}

variable "bucket_name" {
  description = "Storage bucket name"
  type        = string
}

variable "openai_secret" {
  description = "OpenAI API key secret ID"
  type        = string
}

variable "supabase_url_secret" {
  description = "Supabase URL secret ID"
  type        = string
}

variable "supabase_key_secret" {
  description = "Supabase key secret ID"
  type        = string
}

variable "vpc_connector" {
  description = "VPC connector for private resources"
  type        = string
}

variable "service_account" {
  description = "Service account email"
  type        = string
}

variable "min_instances" {
  description = "Minimum instances"
  type        = number
  default     = 0
}

variable "max_instances" {
  description = "Maximum instances"
  type        = number
  default     = 100
}

variable "max_concurrent_requests" {
  description = "Max concurrent requests per instance"
  type        = number
  default     = 80
}

variable "cpu_limit" {
  description = "CPU limit"
  type        = string
  default     = "2"
}

variable "memory_limit" {
  description = "Memory limit"
  type        = string
  default     = "4Gi"
}