variable "prefix" {
  type = string
}

variable "location" {
  type = string
}

variable "resource_group_name" {
  type = string
}

variable "subnet_id" {

  type = string
}

variable "node_size" {
  type    = string
  default = "Standard_D2s_v6"
}

variable "min_nodes" {
  type    = number
  default = 1

}

variable "max_nodes" {
  type    = number
  default = 2
}

resource "azurerm_kubernetes_cluster" "this" {
  name                = "aks-${var.prefix}"
  location            = var.location
  resource_group_name = var.resource_group_name
  dns_prefix          = "aks-${var.prefix}"

  sku_tier = "Free"


  default_node_pool {
    name                 = "system"
    vm_size              = var.node_size
    vnet_subnet_id       = var.subnet_id
    auto_scaling_enabled = true
    min_count            = var.min_nodes
    max_count            = var.max_nodes
    os_disk_size_gb      = 64
    max_pods             = 50
  }

  identity {
    type = "SystemAssigned"
  }

  network_profile {
    network_plugin      = "azure"
    network_plugin_mode = "overlay"
    network_policy      = "calico"
    pod_cidr            = "10.244.0.0/16"
    service_cidr        = "10.100.0.0/16"
    dns_service_ip      = "10.100.0.10"
    load_balancer_sku   = "standard"
    outbound_type       = "loadBalancer"
  }

  oidc_issuer_enabled       = true
  workload_identity_enabled = true

  role_based_access_control_enabled = true


  lifecycle {
    ignore_changes = [default_node_pool[0].node_count]
  }
}

output "cluster_name" {
  value = azurerm_kubernetes_cluster.this.name
}

output "oidc_issuer_url" {
  value = azurerm_kubernetes_cluster.this.oidc_issuer_url
}

output "node_resource_group" {
  value = azurerm_kubernetes_cluster.this.node_resource_group
}

output "kube_config_raw" {
  value     = azurerm_kubernetes_cluster.this.kube_config_raw
  sensitive = true
}
