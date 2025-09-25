# Database module - Redis and optional Cloud SQL

# Redis instance (Memorystore)
resource "google_redis_instance" "redis" {
  count = var.enable_redis ? 1 : 0

  name               = "autoapply-redis-${var.suffix}"
  tier               = "BASIC"
  memory_size_gb     = var.redis_memory_size
  region             = var.region
  redis_version      = "REDIS_7_0"

  authorized_network = var.network_id
  connect_mode       = "DIRECT_PEERING"

  labels = {
    environment = var.environment
    service     = "autoapply"
  }
}

# Cloud SQL instance (optional - if not using Supabase)
resource "google_sql_database_instance" "postgres" {
  count = var.enable_cloud_sql ? 1 : 0

  name             = "autoapply-postgres-${var.suffix}"
  database_version = "POSTGRES_15"
  region           = var.region

  settings {
    tier              = var.database_tier
    disk_size         = var.database_disk_size
    disk_type         = "PD_SSD"
    availability_type = var.environment == "prod" ? "REGIONAL" : "ZONAL"

    backup_configuration {
      enabled                        = true
      start_time                     = "03:00"
      point_in_time_recovery_enabled = true
      transaction_log_retention_days = 7
    }

    ip_configuration {
      ipv4_enabled    = false
      private_network = var.network_id
    }

    database_flags {
      name  = "max_connections"
      value = "100"
    }

    insights_config {
      query_insights_enabled  = true
      query_string_length     = 1024
      record_application_tags = true
      record_client_address   = true
    }
  }

  deletion_protection = var.environment == "prod"
}

# Database creation
resource "google_sql_database" "autoapply" {
  count    = var.enable_cloud_sql ? 1 : 0
  name     = "autoapply"
  instance = google_sql_database_instance.postgres[0].name
}

# Database user
resource "google_sql_user" "autoapply" {
  count    = var.enable_cloud_sql ? 1 : 0
  name     = "autoapply"
  instance = google_sql_database_instance.postgres[0].name
  password = random_password.db_password[0].result
}

resource "random_password" "db_password" {
  count   = var.enable_cloud_sql ? 1 : 0
  length  = 32
  special = true
}

# Outputs
output "redis_host" {
  value = var.enable_redis ? google_redis_instance.redis[0].host : ""
}

output "redis_port" {
  value = var.enable_redis ? google_redis_instance.redis[0].port : 0
}

output "connection_string" {
  value = var.enable_cloud_sql ? "postgresql://${google_sql_user.autoapply[0].name}:${google_sql_user.autoapply[0].password}@/${google_sql_database.autoapply[0].name}?host=/cloudsql/${google_sql_database_instance.postgres[0].connection_name}" : ""
  sensitive = true
}

output "database_instance_name" {
  value = var.enable_cloud_sql ? google_sql_database_instance.postgres[0].name : ""
}