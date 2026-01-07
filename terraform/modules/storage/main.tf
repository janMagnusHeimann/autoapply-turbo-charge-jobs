variable "project_id" { type = string }
variable "region" { type = string }
variable "suffix" { type = string }

resource "google_storage_bucket" "main" {
  name          = "autoapply-files-${var.suffix}"
  location      = var.region
  force_destroy = false
  
  uniform_bucket_level_access = true
}

output "bucket_name" {
  value = google_storage_bucket.main.name
}
