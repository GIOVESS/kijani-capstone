terraform {
  required_providers {
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.25"
    }
  }
}

provider "kubernetes" {
  config_path = var.kubeconfig_path
}

resource "kubernetes_namespace" "staging" {
  metadata {
    name = var.namespace_name
    labels = {
      environment = "staging"
      managed-by  = "terraform"
    }
  }
}
