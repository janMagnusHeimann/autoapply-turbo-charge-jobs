variable "project_id" { type = string }
variable "openai_key" { type = string; sensitive = true }
variable "supabase_url" { type = string }
variable "supabase_key" { type = string; sensitive = true }
variable "github_client" { type = string }
variable "github_secret" { type = string; sensitive = true }

# OpenAI Key
resource "google_secret_manager_secret" "openai scan" {
  secret_id = "openai-api-key"
  replication {
    auto {}
  }
}
resource "google_secret_manager_secret_version" "openai" {
  secret = google_secret_manager_secret.openai.id
  secret_data = var.openai_key
}

# Supabase URL
resource "google_secret_manager_secret" "supabase_url" {
  secret_id = "supabase-url"
  replication {
    auto {}
  }
}
resource "google_secret_manager_secret_version" "supabase_url" {
  secret = google_secret_manager_secret.supabase_url.id
  secret_data = var.supabase_url
}

# Supabase Key
resource "google_secret_manager_secret" "supabase_key" {
  secret_id = "supabase-service-key"
  replication {
    auto {}
  }
}
resource "google_secret_manager_secret_version" "supabase_key" {
  secret = google_secret_manager_secret.supabase_key.id
  secret_data = var.supabase_key
}


output "openai_secret_id" {
  value = google_secret_manager_secret.openai.secret_id
}
output "supabase_url_secret_id" {
  value = google_secret_manager_secret.supabase_url.secret_id
}
output "supabase_key_secret_id" {
  value = google_secret_manager_secret.supabase_key.secret_id
}
