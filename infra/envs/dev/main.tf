terraform {

  required_version = ">= 1.6"
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.14"
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
