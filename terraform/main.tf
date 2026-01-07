# Main Terraform configuration for AutoApply Job Automation Platform

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.5"
    }
  }

  # Backend configuration for state storage
  # Backend configuration for state storage
  # backend "gcs" {
  #   bucket = "autoapply-terraform-state"
  #   prefix = "terraform/state"
  # }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

# Random suffix for unique resource names
resource "random_id" "suffix" {
  byte_length = 4
}

# Local variables
locals {
  services = {
    job_api = {
      name = "job-discovery-api"
      port = 8000
      path = "../backend"
      env_vars = {
        API_HOST             = "0.0.0.0"
        API_PORT             = "8000"
        SERVICE_TYPE         = "JOB_DISCOVERY"
        CORS_ALLOWED_ORIGINS = var.cors_allowed_origins
      }
    }
    cv_api = {
      name = "cv-processing-api"
      port = 8001
      path = "../backend/cv_api"
      env_vars = {
        API_HOST             = "0.0.0.0"
        API_PORT             = "8001"
        SERVICE_TYPE         = "CV_PROCESSING"
        CORS_ALLOWED_ORIGINS = var.cors_allowed_origins
      }
    }
    agent_api = {
      name = "application-agent-api"
      port = 8002
      path = "../backend/application_agent"
      env_vars = {
        API_HOST             = "0.0.0.0"
        API_PORT             = "8002"
        SERVICE_TYPE         = "APPLICATION_AGENT"
        CORS_ALLOWED_ORIGINS = var.cors_allowed_origins
      }
    }
  }
}

# Import modules
module "networking" {
  source     = "./modules/networking"
  project_id = var.project_id
  region     = var.region
  suffix     = random_id.suffix.hex
}

module "database" {
  source     = "./modules/database"
  project_id = var.project_id
  region     = var.region
  suffix     = random_id.suffix.hex
  network_id = module.networking.network_id
}

module "storage" {
  source     = "./modules/storage"
  project_id = var.project_id
  region     = var.region
  suffix     = random_id.suffix.hex
}

module "secrets" {
  source        = "./modules/secrets"
  project_id    = var.project_id
  openai_key    = var.openai_api_key
  supabase_url  = var.supabase_url
  supabase_key  = var.supabase_service_key
  github_client = var.github_client_id
  github_secret = var.github_client_secret
}

module "cloud_run" {
  source             = "./modules/cloud_run"
  for_each          = local.services

  project_id        = var.project_id
  region            = var.region
  service_name      = each.value.name
  service_port      = each.value.port
  dockerfile_path   = each.value.path
  env_vars          = each.value.env_vars

  # Service dependencies
  redis_host        = module.database.redis_host
  database_url      = module.database.connection_string
  bucket_name       = module.storage.bucket_name

  # Secrets
  openai_secret     = module.secrets.openai_secret_id
  supabase_url_secret = module.secrets.supabase_url_secret_id
  supabase_key_secret = module.secrets.supabase_key_secret_id

  vpc_connector     = module.networking.vpc_connector_id
  service_account   = module.iam.cloud_run_service_account
}

module "cloud_tasks" {
  source     = "./modules/cloud_tasks"
  project_id = var.project_id
  region     = var.region
  suffix     = random_id.suffix.hex

  # Queue configurations
  queues = {
    job_discovery_high = {
      name = "job-discovery-high"
      rate_limits = {
        max_dispatches_per_second = 10
        max_concurrent_dispatches = 50
      }
    }
    job_discovery_low = {
      name = "job-discovery-low"
      rate_limits = {
        max_dispatches_per_second = 2
        max_concurrent_dispatches = 10
      }
    }
    cv_generation = {
      name = "cv-generation"
      rate_limits = {
        max_dispatches_per_second = 5
        max_concurrent_dispatches = 20
      }
    }
    applications = {
      name = "applications"
      rate_limits = {
        max_dispatches_per_second = 3
        max_concurrent_dispatches = 10
      }
    }
  }
}

module "iam" {
  source     = "./modules/iam"
  project_id = var.project_id
  suffix     = random_id.suffix.hex
}

module "monitoring" {
  source       = "./modules/monitoring"
  project_id   = var.project_id
  region       = var.region
  services     = keys(local.services)
  alert_email  = var.alert_email
}

# Outputs
output "service_urls" {
  value = {
    for k, v in module.cloud_run : k => v.service_url
  }
  description = "URLs for all deployed Cloud Run services"
}

output "database_connection" {
  value     = module.database.connection_string
  sensitive = true
}

output "redis_host" {
  value = module.database.redis_host
}

output "bucket_name" {
  value = module.storage.bucket_name
}

output "load_balancer_ip" {
  value = module.networking.load_balancer_ip
}