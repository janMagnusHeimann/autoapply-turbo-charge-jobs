# Cloud Run module for deploying microservices

resource "google_cloud_run_service" "service" {
  name     = var.service_name
  location = var.region

  template {
    spec {
      containers {
        image = "${var.region}-docker.pkg.dev/${var.project_id}/autoapply/${var.service_name}:latest"

        ports {
          container_port = var.service_port
        }

        # Environment variables
        dynamic "env" {
          for_each = var.env_vars
          content {
            name  = env.key
            value = env.value
          }
        }

        # Redis connection
        env {
          name  = "REDIS_HOST"
          value = var.redis_host
        }

        # Database URL (if using Cloud SQL instead of Supabase)
        env {
          name  = "DATABASE_URL"
          value = var.database_url
        }

        # Secrets from Secret Manager
        env {
          name = "OPENAI_API_KEY"
          value_from {
            secret_key_ref {
              name = var.openai_secret
              key  = "latest"
            }
          }
        }

        env {
          name = "SUPABASE_URL"
          value_from {
            secret_key_ref {
              name = var.supabase_url_secret
              key  = "latest"
            }
          }
        }

        env {
          name = "SUPABASE_SERVICE_ROLE_KEY"
          value_from {
            secret_key_ref {
              name = var.supabase_key_secret
              key  = "latest"
            }
          }
        }

        # Resource limits
        resources {
          limits = {
            cpu    = var.cpu_limit
            memory = var.memory_limit
          }
        }
      }

      # Service account
      service_account_name = var.service_account

      # Scaling configuration
      container_concurrency = var.max_concurrent_requests
    }

    metadata {
      annotations = {
        "autoscaling.knative.dev/minScale"      = var.min_instances
        "autoscaling.knative.dev/maxScale"      = var.max_instances
        "run.googleapis.com/vpc-access-connector" = var.vpc_connector
        "run.googleapis.com/vpc-access-egress"    = "all-traffic"
      }
    }
  }

  traffic {
    percent         = 100
    latest_revision = true
  }

  autogenerate_revision_name = true
}

# IAM binding to make service publicly accessible
resource "google_cloud_run_service_iam_member" "public" {
  location = google_cloud_run_service.service.location
  project  = google_cloud_run_service.service.project
  service  = google_cloud_run_service.service.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

# Output the service URL
output "service_url" {
  value = google_cloud_run_service.service.status[0].url
}