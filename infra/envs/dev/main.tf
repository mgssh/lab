terraform {

  required_version = ">= 1.6"
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.14"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }
}

provider "azurerm" {
  features {}

  resource_provider_registrations = "none"
}

variable "prefix" {
  type    = string
  default = "books-dev"
}

variable "location" {
  type    = string
  default = "brazilsouth"
}

variable "node_size" {
  type    = string
  default = "Standard_D2s_v6"
}

resource "azurerm_resource_group" "this" {
  name     = "rg-${var.prefix}"
  location = var.location

  tags = {
    project = "lib"
    env     = "dev"
    manager = "terraform"
  }
}

module "keyvault" {
  source = "../../modules/keyvault"

  prefix              = var.prefix
  location            = azurerm_resource_group.this.location
  resource_group_name = azurerm_resource_group.this.name
}

module "postgres" {
  source = "../../modules/postgres"

  prefix              = var.prefix
  location            = azurerm_resource_group.this.location
  resource_group_name = azurerm_resource_group.this.name
  key_vault_id        = module.keyvault.key_vault_id
}

module "acr" {
  source = "../../modules/acr"

  prefix                         = var.prefix
  location                       = azurerm_resource_group.this.location
  resource_group_name            = azurerm_resource_group.this.name
  aks_kubelet_identity_object_id = module.aks.kubelet_identity_object_id
}

resource "azurerm_user_assigned_identity" "math_backend" {
  name                = "id-math-backend-${var.prefix}"
  location            = azurerm_resource_group.this.location
  resource_group_name = azurerm_resource_group.this.name
}

resource "azurerm_federated_identity_credential" "math_backend" {
  name                = "fic-math-backend-${var.prefix}"
  resource_group_name = azurerm_resource_group.this.name
  parent_id           = azurerm_user_assigned_identity.math_backend.id
  audience            = ["api://AzureADTokenExchange"]
  issuer              = module.aks.oidc_issuer_url
  subject             = "system:serviceaccount:math-app:math-backend"
}

resource "azurerm_role_assignment" "math_backend_kv_secrets" {
  scope                = module.keyvault.key_vault_id
  role_definition_name = "Key Vault Secrets User"
  principal_id         = azurerm_user_assigned_identity.math_backend.principal_id
}

output "math_backend_identity_client_id" {
  value = azurerm_user_assigned_identity.math_backend.client_id
}

module "network" {
  source = "../../modules/network"

  prefix              = var.prefix
  location            = azurerm_resource_group.this.location
  resource_group_name = azurerm_resource_group.this.name
}

module "aks" {
  source = "../../modules/aks"

  prefix              = var.prefix
  location            = azurerm_resource_group.this.location
  resource_group_name = azurerm_resource_group.this.name
  subnet_id           = module.network.aks_subnet_id
  node_size           = var.node_size
}

output "resource_group" {
  value = azurerm_resource_group.this.name
}

output "cluster_name" {
  value = module.aks.cluster_name
}


output "get_credentials" {
  value = "az aks get-credentials -g ${azurerm_resource_group.this.name} -n ${module.aks.cluster_name} --overwrite-existing"
}

output "cluster_name" {
  value = azurerm_kubernetes_cluster.this.name
}

output "cluster_id" {
  value = azurerm_kubernetes_cluster.this.id
}

output "key_vault_name" {
  value = module.keyvault.key_vault_name
}

output "postgres_fqdn" {
  value = module.postgres.server_fqdn
}

output "acr_login_server" {
  value = module.acr.acr_login_server
}
