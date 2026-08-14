output "namespace" {
  description = "Name of the created staging namespace"
  value       = kubernetes_namespace.staging.metadata[0].name
}
