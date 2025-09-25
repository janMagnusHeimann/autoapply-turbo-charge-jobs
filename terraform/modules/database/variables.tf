# Variables for Database module

variable "project_id" {
  description = "GCP Project ID"
  type        = string
}

variable "region" {
  description = "GCP Region"
  type        = string
}

variable "suffix" {
  description = "Random suffix for unique naming"
  type        = string
}

variable "network_id" {
  description = "VPC Network ID"
  type        = string
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "prod"
}

variable "enable_redis" {
  description = "Enable Redis/Memorystore"
  type        = bool
  default     = true
}

variable "enable_cloud_sql" {
  description = "Enable Cloud SQL"
  type        = bool
  default     = false
}

variable "redis_memory_size" {
  description = "Redis memory size in GB"
  type        = number
  default     = 1
}

variable "database_tier" {
  description = "Cloud SQL tier"
  type        = string
  default     = "db-f1-micro"
}

variable "database_disk_size" {
  description = "Database disk size in GB"
  type        = number
  default     = 10
}