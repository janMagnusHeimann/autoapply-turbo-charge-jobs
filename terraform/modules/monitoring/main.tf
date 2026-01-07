variable "project_id" { type = string }
variable "region" { type = string }
variable "services" { type = list(string) }
variable "alert_email" { type = string }

# Simple placeholder as monitoring setup can be complex
# In a real setup, we would create notification channels and alert policies here.
