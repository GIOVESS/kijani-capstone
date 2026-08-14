variable "kubeconfig_path" {
  description = "Path to kubeconfig file for the Minikube cluster"
  type        = string
  default     = "~/.kube/config"
}

variable "namespace_name" {
  description = "Name of the staging namespace"
  type        = string
  default     = "kijani-staging"
}
