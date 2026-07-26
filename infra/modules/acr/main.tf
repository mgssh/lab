variable "prefix" {
  type = string
}

variable "location" {
  type = string
}

variable "resource_group_name" {
  type = string
}

variable "aks_kubelet_identity_object_id" {
  type = string
}

resource "random_string" "acr_suffix" {
  length  = 6
  special = false
  upper   = false
  numeric = true
}

resource "azurerm_container_registry" "this" {
  name                = "acr${replace(var.prefix, "-", "")}${random_string.acr_suffix.result}"
  resource_group_name = var.resource_group_name
  location            = var.location
  sku                 = "Basic"
  admin_enabled       = false
}

resource "azurerm_role_assignment" "aks_pull" {
  scope                = azurerm_container_registry.this.id
  role_definition_name = "AcrPull"
  principal_id         = var.aks_kubelet_identity_object_id
}

output "acr_login_server" {
  value = azurerm_container_registry.this.login_server
}

output "acr_id" {
  value = azurerm_container_registry.this.id
}
