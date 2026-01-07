variable "project_id" { type = string }
variable "region" { type = string }
variable "suffix" { type = string }
variable "queues" { type = map(any) }

resource "google_cloud_tasks_queue" "queues" {
  for_each = var.queues

  name     = "${each.value.name}-${var.suffix}"
  location = var.region

  rate_limits {
    max_dispatches_per_second = each.value.rate_limits.max_dispatches_per_second
    max_concurrent_dispatches = each.value.rate_limits.max_concurrent_dispatches
  }
}
