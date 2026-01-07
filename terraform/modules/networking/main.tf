variable "project_id" { type = string }
variable "region" { type = string }
variable "suffix" { type = string }

# VPC Network
resource "google_compute_network" "main" {
  name                    = "autoapply-network-${var.suffix}"
  auto_create_subnetworks = false
}

# Subnet
resource "google_compute_subnetwork" "main" {
  name          = "autoapply-subnet-${var.suffix}"
  ip_cidr_range = "10.0.0.0/24"
  region        = var.region
  network       = google_compute_network.main.id
}

# VPC Access Connector for Serverless (Cloud Run)
resource "google_vpc_access_connector" "main" {
  name          = "connector-${var.suffix}"
  region        = var.region
  ip_cidr_range = "10.8.0.0/28"
  network       = google_compute_network.main.name
}

# Outputs
output "network_id" {
  value = google_compute_network.main.id
}

output "vpc_connector_id" {
  value = google_vpc_access_connector.main.id
}

output "load_balancer_ip" {
  value = "Not Implemented Yet" # Placeholder if no LB is explicitly created
}
