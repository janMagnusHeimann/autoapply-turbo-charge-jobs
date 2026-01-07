variable "project_id" { type = string }
variable "suffix" { type = string }

# Service Account for Cloud Run
resource "google_service_account" "cloud_run" {
  account_id   = "autoapply-run-${var.suffix}"
  display_name = "Cloud Run Service Account"
}

# Grant necessary permissions
resource "google_project_iam_member" "secret_accessor" {
  project = var.project_id
  role    = "roles/secretmanager.secretAccessor"
  member  = "serviceAccount:${google_service_account.cloud_run.email}"
}

resource "google_project_iam_member" "storage_admin" {
  project = var.project_id
  role    = "roles/storage.objectAdmin"
  member  = "serviceAccount:${google_service_account.cloud_run.email}"
}

output "cloud_run_service_account" {
  value = google_service_account.cloud_run.email
}
